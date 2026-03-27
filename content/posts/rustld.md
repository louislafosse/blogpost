## Abstract

This report describes the design and implementation of `rustld`, a user-space ELF loader written in Rust that executes Linux binaries by reconstructing the runtime contract normally assembled by the kernel and system dynamic linker. The implementation targets real binaries rather than reduced demonstrations, so the design must cover much more than segment mapping and a final jump to entry. In the current tree that means executable and shared-object mapping, startup stack and auxv reconstruction, recursive `DT_NEEDED` loading, architecture-specific relocation engines, static and runtime TLS management, constructor sequencing, runtime `dlopen` extension, and the glibc-facing compatibility surfaces that keep libc and libdl internals on the same in-memory object graph.

**Repository:** [louislafosse/rustld](https://github.com/louislafosse/rustld)

The system supports `x86_64` and `aarch64`, and handles both glibc- and musl-oriented targets through explicit startup policy branching. It is exposed as both a direct executable interface and an embeddable runtime through Rust and C APIs. This document keeps the focus on how the current codebase actually behaves: the order in which subsystems must settle, why that order matters, which compatibility layers were required in practice, and which failures forced the current design.

## 1. Introduction and Scope

Dynamic loading is often taught as a compact sequence: parse ELF headers, map segments, relocate symbols, jump to entry. In production, that sequence is only the outer shell. Real startup behavior is a coupled protocol among memory mapping, process startup metadata, relocation state, TLS layout, constructor ordering, runtime symbol lookup, and libc-facing loader state. A loader can be locally correct in one subsystem and still fail immediately if some other subsystem is only partially initialized when constructors, IFUNC resolvers, `__tls_get_addr`, or libc startup code begin to run. `rustld` was built under that practical constraint. The project was never intended to be a byte-identical clone of `ld-linux`; the goal was a controllable user-space runtime that can execute realistic binaries while keeping enough compatibility for common glibc and musl workflows.

Very minimal representation of a Dynamic Linker:
![Dynamic linker resolving shared library dependencies at runtime](https://miro.medium.com/v2/resize:fit:1400/1*xWclbRTvV7Eb2sy2nNBrgw.png)

The scope of `rustld` in the current tree includes loading from raw bytes and from paths, static and dynamic execution paths, recursive dependency loading through `DT_NEEDED`, relocation for both supported architectures, initial and runtime TLS setup, runtime dlfcn behavior through loader stubs, and embedding interfaces that do not require the caller to patch internal state manually. The scope does not claim perfect host-loader parity for every glibc-internal path, and it does not claim that instrumentation environments such as valgrind preserve native behavior in subsystems like rseq. The working assumption throughout the implementation is narrower and more useful: if the loader owns the sequencing and state publication rules precisely enough, it can execute a large class of real binaries with predictable behavior and debug the remaining failures in terms of missing contracts rather than vague “loader instability.”

## 2. Public API and Execution Model

The main public surface is `ElfLoader` in `src/runtime_loader.rs`. It accepts the target bytes, a target argv vector, and optional environment and auxv overrides. If overrides are absent, parent process state is reused. The API intentionally separates preparation from transfer: `prepare_from_bytes` and `prepare_from_bytes_with_entry` return `JumpInfo { entry, stack }`, while `execute_from_bytes` and `execute_from_bytes_with_entry` perform the same preparation and immediately transfer control through the architecture-specific jump handoff. Entry overrides can be given either as a symbol name or as an address, but never both; the loader validates that choice before any low-level work begins. The same layer also applies the `indirect_syscalls` setting, so the syscall mode is fixed before file loading, mapping, or relocation starts.

The shape of the public entrypoint is intentionally small, because almost all of the interesting complexity lives below it:

```rust
pub unsafe fn prepare_from_bytes(
    &self,
    elf_bytes: &[u8],
    target_argv: Vec<String>,
    env_pointer: Option<*const *const u8>,
    auxv_template: Option<&[AuxiliaryVectorItem]>,
    verbose: bool,
) -> JumpInfo {
    self.prepare_from_bytes_with_entry(
        elf_bytes,
        target_argv,
        None,
        None,
        env_pointer,
        auxv_template,
        verbose,
    )
}
```

That separation is not cosmetic. It reflects the actual execution model of the codebase: `runtime_loader` is responsible for argument ownership, environment and auxv inheritance policy, and high-level runtime metadata extraction; `start::execute_elf_from_bytes` and `launch_target_from_bytes` in `src/start/mod.rs` own the low-level bootstrap. The result is a loader that can be used either like a normal executable wrapper or like a reusable in-process runtime. The C ABI in `src/c_api.rs` follows the same structure. It accepts raw ELF bytes, argv/envp/auxv pointers, optional entry overrides, and the indirect-syscall toggle, translates those into Rust-owned state, and catches panics so unwind never crosses the FFI boundary.

That layering is one of the reasons the project stayed maintainable as the compatibility surface expanded. `runtime_loader` converts user-facing concepts into stable low-level inputs: it turns `Vec<String>` into leaked `CString` storage, reconstructs an `argv` pointer array with a terminal null, derives runtime metadata from auxv when the caller does not provide a template, validates that the effective environment pointer is non-null, and applies page-size and syscall-mode configuration before the loader starts touching mappings. By the time `start::execute_elf_from_bytes` runs, the problem has already been reduced from “arbitrary host process state” to “a specific target ELF with explicit startup metadata.” That reduction is not glamorous, but it is exactly the kind of ownership boundary that prevents startup bugs from turning into vague lifetime corruption later.

## 3. Startup Pipeline: Mapping, Stack Reconstruction, and Target Classification

The startup pipeline is implemented in `launch_target_from_bytes`, and the easiest way to understand the current design is to treat it as a strict sequence of state transitions. First the loader parses the input bytes into a `LoadedImage`, determines the entrypoint, base, program headers, dynamic section pointer, and interpreter metadata, and classifies the binary as static or dynamic. Segment realization follows PT_LOAD semantics directly: file-backed bytes are copied into the mapped region, non-file tails are zero-filled, and bounds are page-aligned so downstream relocation and TLS code never see partial segments. In practice, a large class of “relocation failures” turned out to be earlier mapping mistakes, so the code treats segment realization as foundational rather than incidental.

Once the image exists in memory, the loader rewrites auxv to describe the target rather than the parent process. Fields such as `AT_PHDR`, `AT_PHNUM`, `AT_PHENT`, `AT_ENTRY`, `AT_EXECFN`, `AT_HWCAP`, `AT_HWCAP2`, `AT_MINSIGSTKSZ`, and `AT_PAGE_SIZE` are rewritten to match the loaded image and runtime policy. String-backed auxv entries are stabilized into owned storage so the pointers remain valid for the lifetime of the target process. Environment variables are collected from the chosen envp source and normalized before stack construction. The new target stack is then built as a coherent object containing `argc`, a null-terminated `argv`, a null-terminated `envp`, and auxv records ending in `AT_NULL`. Rebuilding the stack from scratch turned out to be much more reliable than partially mutating the host stack, because it gives the loader stable ownership of all pointers that target startup code will read.

The code in `launch_target_from_bytes` makes that ordering explicit rather than implicit:

```rust
set_auxv_ptr(&mut auxv_items, AT_PHDR, image.phdr as *mut ());
set_auxv_val(&mut auxv_items, AT_PHNUM, image.phnum);
set_auxv_val(&mut auxv_items, AT_PHENT, image.phent);
set_auxv_ptr(&mut auxv_items, AT_ENTRY, image.entry as *mut ());
set_auxv_ptr(&mut auxv_items, AT_EXECFN, target_path as *mut ());

let env_storage = collect_env(env_pointer);
let mut env_list: Vec<*const u8> = env_storage
    .iter()
    .map(|value| value.as_ptr() as *const u8)
    .collect();

let new_stack = build_stack(target_args, &env_list, &auxv_items);
```

That snippet captures something important about the implementation style: the loader does not try to “borrow” target startup state from the current process. It computes a target description, materializes owned backing storage for everything pointer-based, and only then emits the final startup image. The same style appears again later in the pipeline when the code snapshots dependency names before moving objects into the linker and when it stabilizes auxv string pointers before constructors can ever read them. In a loader, the difference between “pointer happens to exist right now” and “pointer is guaranteed valid for the remainder of process life” is the difference between clean startup and a crash that surfaces 10 subsystems later.

From there the pipeline diverges. Static binaries can stop once the stack and final entrypoint are known. Dynamic binaries continue through graph construction, relocation, TLS installation, compatibility-state publication, constructor execution, and final handoff. A practical `/bin/ls` launch is therefore not “map and jump”; it is image ingestion, memory realization, auxv and env normalization, fresh stack construction, executable object creation, dependency graph loading, lookup-scope construction, relocation convergence, TLS realization, startup symbol publication, constructor execution, and only then entry transfer.

The dynamic side of that transition is also visible directly in the startup code:

```rust
let executable_idx =
    linker.add_object_with_path("[executable]".to_string(), target_path_string, executable);

linker.prepare_tls_layout();
linker.rebuild_lookup_scopes();

for obj_idx in 0..linker.objects.len() {
    relocation::relocate_with_linker(
        &linker.objects[obj_idx],
        obj_idx,
        &linker,
        &mut ifuncs,
        &mut copies,
        &mut lookup_cache,
    );
}
relocation::apply_copy_relocations(&copies);
```

That is a good summary of the real startup protocol: the executable becomes object zero in a live graph, TLS layout is fixed before relocations that depend on it, lookup scopes are frozen before symbol traffic starts, relocation work is accumulated in explicit queues, and COPY relocation application is forced into a separate phase instead of being interleaved with the primary scan.

## 4. glibc and musl Policy: One In-Process Loader, Two Startup Contracts

`rustld` does not delegate musl execution to an external interpreter process. `PT_INTERP` is parsed and used as metadata and as an input into object loading decisions, but both glibc and musl binaries are executed in-process under the same broad control model. The distinction is in which compatibility state the loader synthesizes before entering the target runtime. For glibc targets, `src/start/mod.rs` initializes synthetic rtld state before any symbol lookups that may depend on it, publishes startup globals such as environment pointers and stack-end metadata, and executes glibc-specific early startup policy. For musl targets, the loader deliberately avoids glibc rtld stub initialization and instead installs musl TLS semantics and reconstructs the minimum musl stage-2 runtime state expected around `__dls2b`.

The branch in the startup code is very direct:

```rust
if musl_target {
    crate::tls::install_tls_musl(&linker.objects, pseudorandom_bytes);
    seed_musl_stage2b_runtime_state(
        &linker,
        new_auxv as *const AuxiliaryVectorItem,
        image.interpreter_path.as_deref(),
        core::ptr::null(),
    );
} else {
    linker.install_tls(pseudorandom_bytes);
    let startup_symbol_writes = collect_startup_symbol_writes(
        &linker,
        new_envp,
        if target_argc > 0 { *new_argv } else { core::ptr::null() },
        pseudorandom_bytes,
    );
    set_symbol_pointer_batch_all(&linker, &startup_symbol_writes);
}
```

That musl bootstrap is one of the more distinctive parts of the codebase. Instead of relying only on fixed offsets, `rustld` decodes live code references around `__dls2b` to recover the addresses of auxv slots, TLS size and alignment words, hwcap slots, and self-pointer state. On `x86_64` this is done by decoding RIP-relative instruction patterns such as `mov`, `lea`, and `call`; on `aarch64` the same job is done through `ADRP+ADD`, `LDR/STR`, and `STP` decoding. The recovered addresses are written by `seed_musl_stage2b_runtime_state`, optionally followed by decoded helper-function calls if the build exposes them. The reason for doing the work this way is simple: musl internals are sensitive to build layout and code generation. Hardcoded offsets work for a narrow binary set and collapse as soon as distributions rebuild packages with different toolchains or local patches. The decode-first approach is slower to implement but substantially more portable.

The glibc path has its own distribution-sensitive logic. On `x86_64`, glibc early startup is guarded by libc layout checks because forcing `__libc_early_init` on unsupported multiarch layouts caused real crashes on Ubuntu and Debian. The current policy is to call `__libc_early_init` only on known supported `/lib64`-style layouts, and otherwise fall back to targeted initialization through `__ctype_init`. The same area also includes symbol-table-driven patching for glibc copy thresholds and explicit seeding of thread locale state. In other words, the loader does not treat “glibc startup” as a single boolean switch; it treats it as a bundle of sub-contracts that vary by architecture and distribution family.

## 5. Dynamic Graph Construction, Symbol Resolution, and Relocation

Dynamic execution is owned by `DynamicLinker` in `src/linking/mod.rs`. The main executable is inserted first, dependencies are loaded recursively from `DT_NEEDED`, and multiple names are recorded for the same object so later lookups can succeed under SONAME, requested path, or canonicalized path variants. The loader’s search strategy combines direct paths, requester `RPATH` when `RUNPATH` is absent, `LD_LIBRARY_PATH`, requester `RUNPATH`, requester-origin fallback, executable-origin fallback, built-in defaults such as `/lib64` and `/usr/lib64`, and configured paths parsed from `ld.so.conf`. The project arrived at that broader strategy through real breakages, not speculation: bundled third-party applications such as Genymotion failed until origin-based fallback and more forgiving versioned-symbol fallback behavior were added.

Once the object graph is loaded, the linker rebuilds lookup scopes for each requester. This is partly a performance optimization and partly a correctness rule. The scope order combines executable-first preemption expectations with requester-closure traversal and load-order fallback. Without that precomputation, repeated graph walking during relocation can drift under runtime loads and become both slow and semantically fragile. `SharedObject` supports the other half of that system. It stores relocation slices, symbol and string tables, TLS metadata, hash metadata, and version tables, and it performs export lookup through GNU hash, SysV hash, and linear fallback paths. Name matching is byte-oriented and version-aware, including base-name fallback and explicit handling for selected non-default glibc exports such as `__res_nsearch`.

The relocation hot path is built around a dedicated cache rather than ad hoc repeated lookups:

```rust
pub struct SymbolLookupCache {
    entries: FxHashMap<SymbolLookupKey, Option<(usize, Symbol)>>,
    entries_no_exclude: FxHashMap<NoExcludeLookupKey, Option<(usize, Symbol)>>,
}
```

This may look like a small implementation detail, but it captures a larger design choice. `rustld` does not resolve symbols by repeatedly “asking the graph what this name means” in whatever state the graph happens to be in. Instead, it precomputes requester scopes, uses stable object indices, and memoizes lookups in a key that includes both the requester and the symbol identity. That makes relocation behavior cheaper, but more importantly it makes it deterministic under runtime extension. The loader can still grow the graph with `dlopen_runtime`, but it does so by rebuilding scopes and then starting a new consistent phase rather than by letting in-flight relocation logic observe a half-updated view.

Relocation then uses that graph and scope information under architecture-specific engines in `src/arch/x86_64/syscall/relocation.rs` and `src/arch/aarch64/syscall/relocation.rs`. The broad orchestration is shared: compute writable relocation ranges, temporarily relax protections with `mprotect`, walk RELA and RELR streams, resolve symbols through the linker and `SymbolLookupCache`, defer COPY and IFUNC/IRELATIVE-sensitive work, then run deferred passes after the primary relocation scan. The explicit cache matters because short-lived dynamic workloads spent a disproportionate amount of time repeating symbol search. The relocation code also carries stub-first binding policy for loader-owned names such as `_dl_*`, `_tunable_*`, and `__tls_get_addr`, so those requests bind to the active loader rather than escaping to an incompatible external implementation. This is also where the relocation formula semantics live: x86_64 handles classes such as `R_X86_64_GLOB_DAT`, `R_X86_64_JUMP_SLOT`, `R_X86_64_RELATIVE`, `R_X86_64_COPY`, `R_X86_64_IRELATIVE`, and TLS relocations including `R_X86_64_TLSDESC`, while aarch64 implements the corresponding `ABS*`, `GLOB_DAT`, `JUMP_SLOT`, `RELATIVE`, `COPY`, `IRELATIVE`, and TLS families.

The deferred ordering is one of the highest-value correctness rules in the whole loader:

```rust
relocation::apply_copy_relocations(&copies);
relocation::apply_irelative_relocations(&ifuncs);
```

That ordering exists because immediate relocation is not universally safe. COPY relocation writes must observe already-relocated source objects, while IFUNC and IRELATIVE resolvers are executable code running against the current process state. If they execute too early, they can run while symbol state, TLS metadata, or even libc startup variables are still partial. The loader therefore treats “relocations applied” as a multi-stage condition, not a single boolean fact.

## 6. TLS as Persistent Runtime State

TLS is treated as first-class state rather than an afterthought. `prepare_tls_layout` computes module IDs, alignment, per-module block offsets, TP-relative offsets, a reserved runtime static TLS window, and a small rseq-safe area below TP. That layout is then consumed by `install_tls` to allocate the initial TLS block, construct the TCB, allocate the DTV with surplus slots, copy PT_TLS initialization images, seed guards, and publish the thread pointer. The design matters because TLS state does not end at startup. Once runtime `dlopen` becomes part of the supported behavior, TLS becomes an incrementally evolving global structure, not a startup-only blob.

The layout phase is concrete about the memory model it wants:

```rust
#[cfg(target_arch = "x86_64")]
const RSEQ_RESERVE_BYTES: usize = 256;
const RUNTIME_STATIC_SURPLUS_BYTES: usize = 64 * 1024;

for obj in objects.iter_mut() {
    if let Some(ref mut tls) = obj.tls {
        tls.module_id = module_id;
        module_id += 1;
    }
}

let runtime_static_start = cursor;
cursor = cursor.saturating_add(RUNTIME_STATIC_SURPLUS_BYTES);
let runtime_static_end = cursor;
```

That is worth emphasizing because it answers a question that simplified loader explanations usually skip: how much TLS space should exist for modules that have not been loaded yet? In a runtime loader, “zero” is not a neutral answer. If a later `dlopen` introduces initial-exec TLS and there is no reserved static window, generated TP-relative code can become semantically impossible to satisfy. `rustld` therefore reserves static TLS headroom up front and records the runtime window as part of the persistent layout state. That decision came directly from real failures in runtime-loaded graphics and NSS-heavy workloads.

That is why `register_runtime_tls_modules` exists. When new objects with TLS segments are loaded after startup, the loader assigns them module IDs, tries to fit them into the reserved static window, falls back to dynamic allocation when necessary, grows the DTV if needed, and then propagates updates to tracked thread TCBs. The tracked-thread registry exists precisely because runtime TLS updates are process-wide semantic changes: if an existing thread can execute TP-relative code against a newly loaded static-TLS module, the loader must keep that thread’s DTV and static-TLS view coherent. This area has also seen some of the hardest real-world bugs. The Bisq close-time crash was traced to runtime static-TLS pressure combined with glibc thread-descriptor assumptions. The resulting hardening included reserving 64 KiB of runtime static TLS surplus, avoiding intrusive-list seeding on partial glibc descriptors, reinitializing thread descriptors only when their TLS view is stale, pruning dead tracked threads before propagation, and making `resolve_tls_address` treat static TLS modules as TP-plus-layout-deterministic rather than trusting stale DTV content.

The runtime-registration path also documents a hard-earned concurrency decision:

```rust
for obj in objects.iter_mut() {
    let Some(ref mut tls) = obj.tls else {
        continue;
    };
    if tls.module_id != 0 {
        continue;
    }

    tls.module_id = next_module_id;
    // Keep runtime-loaded modules on dynamic TLS.
    let static_tls_fits = false;
    tls.offset = 0;
    tls.block_offset = 0;
```

That forced-dynamic path is not an omission. It is a safety policy. Eagerly assigning runtime-loaded modules into static TLS would require mutating other live threads' TLS blocks and DTV state while helper threads may already be running resolver or NSS code. On paper that can be made to work; in practice it is exactly the sort of cross-thread mutation that produces intermittent crashes in real networked workloads. The current implementation therefore prefers a more conservative dynamic-TLS runtime path over a more aggressive but less safe static assignment policy.

The same section of the codebase also owns `TLSDESC` and `__tls_get_addr` integration. Relocation engines compute and write descriptor data for classes such as `DTPMOD`, `DTPOFF`, `TPOFF`, and `TLSDESC`, while `ld_stubs` provides the runtime helper side. The result is that dynamically loaded TLS modules remain addressable under generated code rather than only under special-cased startup paths.

## 7. rtld Compatibility, Runtime dlfcn, and Real Failure Cases

For glibc-facing behavior, `DynamicLinker::init_rtld_stubs` allocates and populates a synthetic compatibility region containing `_rtld_global`, `_rtld_global_ro`, a `link_map`, standalone libc-facing globals, and auxv-backed state such as rseq metadata and guard values. The allocated region is intentionally generous and zero-initialized because glibc may read well beyond the subset a simplified model would normally fill. The current implementation also includes a legacy dlfcn hook table inside that synthetic region. Older glibc families, particularly `glibc 2.31`-era builds, can route internal operations such as `__libc_dlopen_mode` and `__libc_dlsym` through `_dl_open_hook` and `_dl_open_hook2` rather than through the public libdl entrypoints. `rustld` now fills that hook table with its own `dlopen`, `dlsym`, `dlclose`, and `dlvsym` implementations and publishes `_dl_open_hook` and `_dl_open_hook2` during startup symbol writes. That keeps internal glibc dlfcn traffic on the same active object graph as public `dlopen_runtime` activity.

The publication path is tiny in code and large in effect:

```rust
if let Some(hook) = unsafe { linker.rtld_dlfcn_hook() } {
    writes.push(("_dl_open_hook", hook));
    writes.push(("_dl_open_hook2", hook));
}
```

Without that hook publication, internal glibc dlfcn helpers can end up following an rtld-private path that `rustld` never initialized, even while public `dlopen` calls appear to work. That is a good example of the kind of compatibility surface loader development forces you to care about: the public ABI may look correct, but the actual process is still broken if libc bypasses that ABI and reaches for an older internal mechanism.

Runtime `dlopen` itself is not treated as a separate miniature loader. `dlopen_runtime` extends the live graph by loading the new subtree, rebuilding scopes, registering runtime TLS modules for the new slice, relocating only the newly loaded objects, applying COPY and IFUNC/IRELATIVE queues, finalizing TLS images, and running constructors rooted at the requested subtree. That reuse of startup-grade rules is deliberate: the runtime case differs from bootstrap in preexisting state and active threads, not in the basic invariants required for correctness.

The runtime loader path mirrors startup closely enough that the code looks like a second, scoped bootstrap:

```rust
let mut lookup_cache = relocation::SymbolLookupCache::with_capacity(lookup_cache_capacity);
for obj_idx in relocation_indices {
    let object_snapshot = self.objects[obj_idx].clone();
    relocation::relocate_with_linker(
        &object_snapshot,
        obj_idx,
        self,
        &mut ifuncs,
        &mut copies,
        &mut lookup_cache,
    );
    core::mem::forget(object_snapshot);
}
relocation::apply_copy_relocations(&copies);
relocation::apply_irelative_relocations(&ifuncs);
```

That reuse matters because runtime loading is not just “start but later.” It happens in the presence of active threads, previously published loader state, and possibly libc helper threads that themselves trigger more loading. The safest way to handle that situation is not to invent a weaker runtime algorithm; it is to keep the same invariants and narrow the affected object slice.

Several of the most useful design changes in the current tree came from concrete failures in this compatibility layer. Ubuntu/Debian multiarch glibc builds exposed a startup crash where forcing `__libc_early_init` on unsupported layouts caused early faults, while skipping it entirely left ctype state uninitialized for workloads such as `sqrt_with_ld`. The current layout-aware early-init plus `__ctype_init` fallback came from that investigation. Bisq exposed a different class of problem: application startup succeeded, but close-time worker-thread activity crashed under `__tls_get_addr` because runtime static-TLS pressure and partial glibc thread descriptors did not mix safely. That failure drove the runtime TLS hardening described earlier. Genymotion uncovered a third class of issue in the dependency and symbol-resolution path: bundled DSOs with stale `RPATH` values and non-default glibc exports failed until origin-based fallback lookup and more permissive versioned-export fallback behavior were added. These failures matter because they explain why `rustld` is structured the way it is today. The code is not simply “feature-rich”; it is shaped by specific contracts that broke in the field.

Instrumentation behavior belongs in the same discussion. Under valgrind, the loader disables rseq metadata in stubs because native glibc expectations about rseq registration do not hold there. Under native `x86_64`, the rseq defaults remain TP-relative as expected. The point is not to make valgrind perfect; it is to keep instrumentation artifacts from masquerading as loader bugs when the underlying runtime contract is already known to differ.

## 8. Architecture Split, Performance Process, Limits, and Conclusion

The architecture split keeps low-level ABI logic local and shared policy stable. `x86_64` carries extensive relocation coverage and the majority of glibc startup tuning, while `aarch64` implements the same high-level orchestration model with its own relocation and startup glue. Because graph loading, scope computation, startup stack building, runtime loading, and most TLS policy are architecture-neutral, improvements in those areas propagate across both targets without duplicating logic. The practical validation strategy reflects that split: x86_64 is exercised heavily on host systems, and aarch64 behavior is validated through qemu user-mode and architecture-local relocation paths.

Performance work in `rustld` has followed a strict measure-change-validate loop. Profiling first identifies hotspots, usually around symbol lookup or relocation, then the code is changed in narrow scope, and finally the result is validated against real binaries rather than synthetic loader micro-tests alone. That process is what produced the keyed lookup cache, precomputed requester scopes, exportability masks, and byte-level symbol-name handling. The same discipline also explains why some “optimizations” were not kept: in loader code, fast-but-fragile changes regress quickly because they disturb startup order or ownership assumptions. Slower but semantically robust changes are usually a better base for later optimization.

The current limits are explicit. Interactive `/usr/bin/fish` remains a known limitation in some PTY contexts even when simpler binaries succeed under equivalent conditions. Valgrind can still emit `brk segment overflow` warnings with otherwise clean heap summaries, and those are treated as instrumentation-model artifacts unless they line up with independent corruption evidence. Compatibility parity with all glibc internal paths is still a moving target, especially when unusual constructors, runtime loading, or thread behavior stress parts of libc that are only lightly documented.

Even with those limits, `rustld` has moved well beyond prototype status. It reconstructs startup state, maps executables and dependency graphs, applies relocations across two architectures, manages TLS for both startup and runtime extension, presents a usable runtime-linker compatibility surface to glibc and libdl, and exposes those capabilities through both Rust and C interfaces. The main result is methodological: reliable user-space loader behavior does not emerge from any single subsystem being “good enough.” It emerges when mapping, auxv reconstruction, graph loading, relocation, TLS, constructor execution, and runtime-linker state publication are treated as one ordered protocol and implemented with ownership and timing rules that survive real binaries.

<details>
<summary>Mermaid Graph representing rustld implementation</summary>

```mermaid
flowchart TD

    A0([user invokes rustld with target]) --> A1[examples rustld main]
    A1 --> A2[read target ELF bytes]
    A2 --> A3[ElfLoader execute_from_bytes]
    A3 --> A4[ElfLoader prepare_from_bytes_with_entry]

    subgraph RL [runtime_loader path]
      A4 --> B1[validate args and entry override]
      B1 --> B2[argv strings to C strings]
      B2 --> B3[build argv pointer array with NULL]
      A4 --> B4[resolve env option]
      A4 --> B5[resolve auxv option]
      B5 --> B6[derive runtime metadata from auxv]
      B6 --> B7[set page size]
      B7 --> B8[set direct or indirect syscall mode]
      B3 --> B9[start execute_elf_from_bytes]
      B4 --> B9
      B5 --> B9
      B6 --> B9
    end

    subgraph ST [start launch pipeline]
      B9 --> C1[load_target_image_from_bytes]
      C1 --> C2[parse ELF and program headers]
      C2 --> C3[map PT_LOAD segments]
      C3 --> C4[collect LoadedImage metadata]
      C4 --> C5[normalize auxv and rewrite key tags]
      C5 --> C6[collect env and stabilize auxv string pointers]
      C6 --> C7[build target startup stack image]
      C7 --> C8[create executable SharedObject]
    end

    C8 --> D0{has dynamic section}

    subgraph STATIC [static binary path]
      D0 -- no --> S1[skip dynamic linker graph]
      S1 --> S2[select entry]
      S2 --> S3[JumpInfo entry and stack]
      S3 --> S4[arch jump_to_entry]
      S4 --> S5([target static runtime starts])
    end

    subgraph DYN [dynamic classify and load]
      D0 -- yes --> D1[inspect PT_INTERP and DT_NEEDED]
      D1 --> D2{target flavor}

      D2 -- glibc --> D3[init glibc rtld stubs]
      D2 -- musl --> D4[musl in-process path]
      D2 -- other --> D5[generic in-process path]

      D3 --> D11[add executable object]
      D4 --> D11
      D5 --> D11
      D11 --> D12[walk DT_NEEDED recursively]
      D12 --> D13[resolve library path]
      D13 --> D14[map dependency object]
      D14 --> D15[insert object and recurse]
      D15 --> D16{more dependencies}
      D16 -- yes --> D13
      D16 -- no --> D17[rebuild lookup scopes]
    end

    subgraph TLS_LAYOUT [tls prepare layout before relocation]
      D17 --> T1[prepare_tls_layout]
      T1 --> T2[assign module_id for PT_TLS objects]
      T2 --> T3[compute max alignment]
      T3 --> T4[place dependency TLS blocks]
      T4 --> T5[place main executable TLS block]
      T5 --> T6[compute block_offset and TP relative offset]
      T6 --> T7[reserve runtime static window for dlopen IE TLS]
      T7 --> T8[reserve rseq safety bytes below TP]
      T8 --> T9[publish TLS_LAYOUT]
    end

    subgraph REL [relocation engine path]
      T9 --> R0{runtime arch}
      R0 -- x86_64 --> R1[x86 relocate_with_linker]
      R0 -- aarch64 --> R2[aarch64 relocate_with_linker]

      R1 --> R3[parse RELA JMPREL RELR]
      R2 --> R3
      R3 --> R4[apply RELR packed relatives]
      R4 --> R5[iterate relocation entries]

      R5 --> R6{symbol lookup needed}
      R6 -- no --> R7[direct write relocation value]
      R6 -- yes --> R8[lookup_symbol_any with SymbolLookupCache]
      R8 --> R9[DynamicLinker scope lookup]
      R9 --> R10[SharedObject export lookup hash paths]
      R10 --> R11[write resolved value]

      R8 --> RTLS0{tls relocation class}
      RTLS0 -- x86 DTPMOD DTPOFF TPOFF TLSGD TLSLD GOTTPOFF TLSDESC --> RTLS1[write TLS reloc data for x86]
      RTLS0 -- aarch64 DTPMOD DTPREL TPREL TLSDESC --> RTLS2[write TLS reloc data for aarch64]

      RTLS1 --> RTLSD0{TLSDESC mode}
      RTLS2 --> RTLSD0
      RTLSD0 -- runtime lookup needed --> RTLSD1[descriptor fn points to arch tlsdesc_resolver]
      RTLSD1 --> RTLSD2[descriptor arg points to TlsIndex module and offset]
      RTLSD0 -- direct TP relative --> RTLSD3[descriptor fn points to arch tlsdesc_return]
      RTLSD3 --> RTLSD4[descriptor arg stores direct TP relative offset]

      R7 --> R12{special class}
      R11 --> R12
      R12 -- STT_GNU_IFUNC --> R13[queue IrelativeReloc from symbol resolver]
      R12 -- IRELATIVE reloc type --> R14[queue IrelativeReloc from reloc addend]
      R12 -- COPY reloc type --> R15[queue CopyReloc source destination size]
      R12 -- normal --> R16[next relocation]
      R13 --> R16
      R14 --> R16
      R15 --> R16
      R16 --> R17{more relocations}
      R17 -- yes --> R5
      R17 -- no --> R18[all objects scanned]
    end

    subgraph POST [post relocation order]
      R18 --> P1[apply_copy_relocations]
      P1 --> P2{musl target}
      P2 -- no --> P3[install_tls initial thread]
      P3 --> P4[allocate TLS region and copy PT_TLS images]
      P4 --> P5[build TCB and DTV]
      P5 --> P6[set thread pointer register]
      P6 --> P7[stamp thread tid and register tracked thread]
      P7 --> P8[seed startup glibc symbol pointers]
      P8 --> P9[apply_irelative_relocations]

      P2 -- yes --> PM1[install_tls_musl initial thread]
      PM1 --> PM2{decode stage2b by arch}
      PM2 -- x86_64 --> PM2X[decode RIP relative refs around __dls2b]
      PM2 -- aarch64 --> PM2A[decode ADRP ADD LDR STP refs around __dls2b]
      PM2X --> PM3[seed auxv tls hwcap self slots]
      PM2A --> PM3
      PM3 --> PM4{stage helper funcs decoded}
      PM4 -- yes --> PM5[call stage2b helper pair]
      PM4 -- no --> PM6[skip helper call]
      PM5 --> PM7[seed musl internal queue slot fallback]
      PM6 --> PM7
      PM7 --> P9

      P9 --> P10[invoke each queued IRELATIVE resolver]
      P10 --> P11[write resolver return value into relocation slot]
      P11 --> P12[resolve requested entry override]
      P12 --> P13{glibc startup path}
      P13 -- yes --> P14[update rtld stack end]
      P14 --> P14A{x86_64 libc layout supported}
      P14A -- yes --> P14B[call __libc_early_init]
      P14A -- no --> P14C[call __ctype_init fallback]
      P14B --> P15[patch libc copy thresholds]
      P14C --> P15
      P15 --> P16[run constructors dependency order]
      P13 -- no --> P16
      P16 --> P17[JumpInfo entry and stack]
      P17 --> P18[arch jump_to_entry]
      P18 --> P19([target startup and main execute])
    end

    subgraph TLS_ADDR [runtime __tls_get_addr path]
      P19 -. tls access .-> TA1[__tls_get_addr in ld_stubs]
      TA1 --> TA2[tls resolve_tls_address module and offset]
      TA2 --> TA3[read current tcb and dtv]
      TA3 --> TA3A{module is static}
      TA3A -- yes --> TA3B[compute base from TP plus layout and refresh DTV slot]
      TA3B --> TA5[return module_base plus offset]
      TA3A -- no --> TA4{slot exists and module base present}
      TA4 -- yes --> TA5
      TA4 -- no --> TA6[grow DTV if needed]
      TA6 --> TA7[allocate dynamic TLS block if needed]
      TA7 --> TA8[store module base in dtv]
      TA8 --> TA5
    end

    subgraph DLOPEN [runtime dlopen extension path]
      P19 -. runtime load .-> L1[ld stubs dlopen dlsym path]
      L1 --> L2[DynamicLinker dlopen_runtime]
      L2 --> L3[load and map new dependency subtree]
      L3 --> L4[rebuild lookup scopes]
      L4 --> L5[register_runtime_tls_modules]
      L5 --> L6[assign module_id for new modules]
      L6 --> L7[fit runtime static window or mark dynamic]
      L7 --> L8[allocate and swap expanded DTV]
      L8 --> L9[propagate TLS updates to tracked threads]
      L9 --> L10[relocate new objects]
      L10 --> L11[apply copy then irelative]
      L11 --> L12[finalize_runtime_tls_images]
      L12 --> L13[run init arrays for loaded subtree]
    end
```
</details>
