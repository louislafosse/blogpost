## Abstract

This article documents the implementation of `rustld`, a user-space ELF loader that can execute Linux binaries by rebuilding process startup state, mapping objects, relocating symbols, installing TLS, running constructors, and handing off control to the target entrypoint.

The project started as a practical runtime engineering effort, not as a parser demo. The primary target was correctness against real programs (glibc and musl, static and dynamic, x86_64 and aarch64) while keeping the implementation embeddable from both Rust and C.

This post explains the full pipeline from `ElfLoader` API calls to target execution, including key technical tradeoffs and failure modes encountered during implementation.

## 1. Problem Statement and Design Goals

A dynamic loader is not one subsystem. It is a coordinated set of contracts:

- ELF mapping and memory permissions
- startup stack/argv/envp/auxv ABI reconstruction
- dependency graph construction (`DT_NEEDED`, lookup scopes)
- relocation execution with correct ordering
- TLS layout and runtime expansion
- constructor/destructor sequencing
- libc/runtime linker compatibility surfaces

If one of those is slightly wrong, crashes happen far from the root cause.

`rustld` design goals were:

- run real Linux binaries from bytes or file paths
- support both direct execution and embedded API usage
- support glibc and musl targets
- support x86_64 and aarch64
- keep architecture-dependent code isolated
- keep performance acceptable for short-lived binaries

Non-goals were:

- being bit-for-bit identical to system `ld-linux`
- implementing every obscure ELF extension at once
- hiding all behavioral differences under heavy instrumentation tools

## 2. Repository Architecture

The codebase is deliberately split into orchestration modules and architecture modules.

- `src/runtime_loader.rs`: high-level public entrypoints (`prepare`, `execute`)
- `src/start/mod.rs`: process startup pipeline, stack rebuild, handoff
- `src/linking/mod.rs`: dynamic linker state, object registry, lookup scopes
- `src/shared_object.rs`: loaded object representation and symbol/hash lookup
- `src/tls.rs`: static TLS layout, installation, runtime TLS growth
- `src/ld_stubs.rs`: runtime linker compatibility symbols and glue
- `src/c_api.rs`: C ABI wrappers around `ElfLoader`
- `src/arch/x86_64/*`, `src/arch/aarch64/*`: arch-specific syscall/trampoline/relocation

This split was essential once relocation and TLS became architecture-dependent but startup policy remained shared.

## 3. Public API Layer (`ElfLoader`)

The primary API accepts target bytes and a user-facing argv as `Vec<String>`, then internally converts that into C-style pointers.

```rust
pub unsafe fn prepare_from_bytes(
    &self,
    elf_bytes: &[u8],
    target_argv: Vec<String>,
    env_pointer: Option<*const *const u8>,
    auxv_template: Option<&[AuxiliaryVectorItem]>,
    verbose: bool,
) -> JumpInfo
```

Important behavior:

- `target_argv` is required and validated.
- `env_pointer: None` means inherit parent environment.
- `auxv_template: None` means derive auxv from parent process.
- `prepare_*` returns `JumpInfo { entry, stack }` without jumping.
- `execute_*` performs the jump and never returns on success.
- `*_with_entry` variants allow entry override by symbol or address.

This API shape makes normal usage simple while preserving full control for embedding scenarios.

## 4. Startup Pipeline Overview

The core execution path in `start::launch_target_with_source` is:

1. Load target image (from bytes or file).
2. Inspect ELF kind and interpreter metadata.
3. Normalize and patch auxv values.
4. Rebuild target startup stack (`argc/argv/envp/auxv`).
5. If static: return `JumpInfo`.
6. If dynamic: construct `DynamicLinker`, load dependencies, relocate, install TLS, run init, handoff.

For dynamic binaries, this is where almost all complexity lives.

## 5. ELF Mapping and Image Construction

Target mapping follows normal ELF PT_LOAD behavior:

- parse ELF header and program headers
- compute virtual address bounds
- allocate mapping region
- copy file bytes for each load segment
- zero-fill `p_memsz - p_filesz` (BSS)
- gather pointers to PHDR, DYNAMIC, interpreter string

A representative segment copy path:

```rust
if header.p_filesz > 0 {
    core::ptr::copy_nonoverlapping(
        elf_bytes.as_ptr().add(header.p_offset),
        dest,
        header.p_filesz,
    );
}
if header.p_memsz > header.p_filesz {
    core::ptr::write_bytes(
        dest.add(header.p_filesz),
        0,
        header.p_memsz - header.p_filesz,
    );
}
```

Most "later" bugs are often born here (bad bounds, wrong base arithmetic, wrong permission restoration), so this phase was hardened early.

## 6. Rebuilding Process Startup ABI

Mapping alone is insufficient. The target expects a valid initial stack layout and coherent auxv.

`rustld` rewrites key auxv fields to point at the loaded target image:

- `AT_PHDR`, `AT_PHNUM`, `AT_PHENT`
- `AT_ENTRY`, `AT_EXECFN`
- `AT_BASE` (when relevant)
- `AT_PAGE_SIZE`, `AT_HWCAP`, `AT_HWCAP2`, `AT_MINSIGSTKSZ`
- `AT_RANDOM` stabilization through copied storage

Then it builds a new stack image in ABI order:

- `argc`
- argv pointers + null terminator
- env pointers + null terminator
- auxv key/value pairs ending with `AT_NULL`

This startup-contract reconstruction was one of the most important reliability milestones.

## 7. Dynamic Dependency Loading

For dynamic binaries, `DynamicLinker` is initialized and populated:

- executable inserted as first object
- `DT_NEEDED` dependencies resolved recursively
- per-object metadata retained (path, base, dynamic pointers, TLS, symbol tables)
- lookup scopes prepared

Library search defaults include:

- `/lib64`, `/usr/lib64`
- `/lib`, `/usr/lib`
- `/usr/local/lib64`, `/usr/local/lib`

`LD_LIBRARY_PATH` and configured paths are also handled.

## 8. Shared Object Model and Fast Symbol Paths

`SharedObject` captures all runtime lookup state:

- `SymbolTable` and `StringTable`
- GNU hash and SysV hash tables
- `DT_VERSYM` visibility filtering
- precomputed exportability bitmask
- precomputed SysV export buckets

Lookup path supports both hash families and avoids repeated full scans.

It also performs version-suffix tolerant matches (`name` and `name@VERSION`) using byte-level checks to reduce overhead.

## 9. Relocation Engines (x86_64 + aarch64)

Relocation logic is architecture-specific and lives in:

- `src/arch/x86_64/syscall/relocation.rs`
- `src/arch/aarch64/syscall/relocation.rs`

Shared strategy:

- make relocation target ranges writable
- iterate RELA and optional RELR streams
- resolve symbol-based relocations via linker scopes
- record deferred classes (IFUNC/IRELATIVE/COPY)
- restore protections

A critical performance and correctness component is `SymbolLookupCache`.

```rust
pub struct SymbolLookupCache {
    entries: FxHashMap<SymbolLookupKey, Option<(usize, Symbol)>>,
    entries_no_exclude: FxHashMap<NoExcludeLookupKey, Option<(usize, Symbol)>>,
}
```

This avoids repeated scope traversals for hot symbol names during large relocation batches.

## 10. Stub-Preferred Symbol Resolution

Certain symbols are intentionally resolved to local stub implementations before normal lookup (for rtld/libdl contract behavior), for example:

- `_dl_*`
- `__tunable_*`
- `__tls_get_addr`
- `dlopen`, `dlsym`, `dlclose`, `dlerror`, `dl_iterate_phdr`

This behavior is architecture-aware and implemented directly in relocation modules using PHF static maps for low-overhead lookup.

## 11. IFUNC, IRELATIVE, and COPY Ordering

Resolver ordering matters.

`rustld` uses deferred queues for classes that should run after primary relocation convergence:

- copy relocations collected in `CopyReloc`
- IFUNC-like and IRELATIVE entries collected in `IrelativeReloc`

Processing order:

1. primary relocations
2. copy relocations
3. IFUNC/IRELATIVE resolver calls

Executing these too early produced unstable behavior in real-world binaries, so deferred execution became mandatory.

## 12. TLS Architecture: Static Layout First

TLS implementation in `src/tls.rs` is one of the core subsystems.

`prepare_tls_layout` does:

- assign module IDs for objects with `PT_TLS`
- compute block offsets with alignment constraints
- reserve runtime static window
- reserve a small guard area below TP for glibc/rseq-sensitive behavior
- compute final TP-relative offsets per module

The resulting `TlsLayout` captures:

- `tcb_offset`
- `tls_size`
- module count
- max alignment
- runtime static range

Without correct TP-relative offsets, local-exec and initial-exec TLS models fail quickly.

## 13. TLS Installation (`install_tls`)

After relocation, initial thread TLS is installed:

- allocate TLS+TCB memory
- copy TLS init images
- zero trailing TLS bytes
- create DTV storage with spare slots
- initialize TCB metadata
- seed stack and pointer guards from random source
- set thread pointer (arch-specific)

The implementation uses glibc-compatible DTV conventions, including surplus slots to reduce early realloc churn.

## 14. Runtime TLS Growth (`dlopen`-style)

Dynamic module loading after startup requires live TLS growth.

`register_runtime_tls_modules` handles:

- assigning module IDs for newly loaded TLS modules
- static placement when capacity allows
- dynamic TLS fallback when static space is exhausted
- DTV growth and propagation
- updates across tracked thread TCBs

Thread registry synchronization is explicit (`THREAD_TRACK_LOCK`) and conservative.

## 15. `__tls_get_addr` and TLSDESC Path

TLS relocations resolve through:

- static TP-relative offsets when possible
- runtime module lookup and allocation via `resolve_tls_address`

TLSDESC descriptors are wired so the fast path can return direct offsets when known, while fallback paths call into resolver logic using TLS index payloads.

This keeps both startup and post-`dlopen` behavior valid.

## 16. glibc Runtime-Linker Contract (`ld_stubs`)

Even with relocation and TLS correct, glibc startup can fail if rtld globals are missing or inconsistent.

`ld_stubs.rs` provides compatibility surfaces such as:

- `_rtld_global`, `_rtld_global_ro`
- link_map-compatible structures
- `_dl_argv`, `__libc_enable_secure`, `__libc_stack_end`
- `_dl_*` helper exports used by libc/libdl paths
- tunable hooks and TLS hooks

It also includes guarded behavior for instrumentation contexts (for example valgrind/rseq-sensitive paths).

This layer is not optional for glibc-heavy binaries.

## 17. musl vs glibc Handling

`rustld` handles musl and glibc differently where required.

- musl-target interpreter chains may be attempted first (`try_chainload_musl_interpreter`) for compatibility.
- glibc paths rely more heavily on rtld contract emulation (`ld_stubs`) and strict TLS/runtime ordering.

This split came from observed behavior differences, not from theoretical preference.

## 18. Architecture-Specific Layer (`src/arch/*`)

Architecture-specific folders own low-level behavior:

- mmap/mprotect wrappers
- exit syscall wrappers
- thread-pointer set/get
- jump trampoline/handoff ABI
- relocation opcode handling

Currently supported:

- x86_64
- aarch64

This keeps cross-arch extension feasible without duplicating high-level startup logic.

## 19. Optional Indirect Syscall Mode

`ElfLoader` exposes `indirect_syscalls` mode.

When enabled (supported on x86_64 and aarch64), syscalls are emitted through anonymous executable trampoline pages rather than fixed instruction sequences in the image.

This is a runtime mode toggle, applied before loader activity starts.

## 20. C Embedding API

`src/c_api.rs` exports a stable C-facing API with explicit status codes.

Key functions:

- `rustld_elfloader_prepare_from_bytes`
- `rustld_elfloader_execute_from_bytes`
- `rustld_elfloader_execute_from_bytes_with_entry`

Features:

- argv parsing from C pointers
- optional envp/auxv override
- entry override by symbol or address
- panic containment via `catch_unwind` to return error codes instead of unwinding across FFI

This allows integrating rustld in C applications without reimplementing startup logic.

## 21. Entry Override and Shared Library Invocation

`*_with_entry` execution modes allow selecting a non-default entry:

- symbol-based (`entry_symbol`)
- address-based (`entry_address`)

This made it practical to load and jump into specific exported functions from shared objects, enabling SDK-like embedding patterns beyond normal executable startup.

## 22. Performance Work and Hotspots

Main observed hotspots were:

- symbol lookup churn during relocation
- repeated string handling in lookup paths
- startup globals set in multiple passes

Optimizations applied in the current codebase include:

- `FxHashMap` caches in relocation lookup paths
- precomputed exportability masks in `SharedObject`
- prebucketed SysV export candidates
- `memchr`-based version stripping and symbol name parsing
- `SmallVec`/`SmartString` use in selected hot paths

Performance remains workload-dependent (short process startup vs long-running targets), but these changes reduced relocation overhead significantly.

## 23. Debugging Methodology and Regression Strategy

This project required continuous regression testing because correctness is global, not local.

Effective tools were:

- `strace` for syscall-level startup behavior
- `valgrind` for initialization and ABI consistency checks
- `flamegraph` and extracted titles for hotspot inspection
- `qemu-aarch64` + aarch64 rootfs for cross-arch runtime tests

Regression tests were repeatedly run on representative binaries such as:

- `/bin/ls`, `/bin/pwd`, `/bin/id`
- `/usr/bin/fish` (interactive stress case)
- custom glibc and musl test binaries
- aarch64 binaries under qemu user mode

## 24. Known Limitations

Current known limitations include:

- `/usr/bin/fish` interactive mode still has failure behavior in some runtime contexts (notably interactive PTY paths), while non-interactive piped mode can work.
- Valgrind may report `brk segment overflow` warnings even when heap accounting is clean; this is typically a valgrind limitation around brk growth modeling, not necessarily a memory leak.
- Full parity with system loaders under all glibc internals is still an ongoing target.

These limitations are documented so users can distinguish correctness issues from tool-specific artifacts.

## 25. Why This Was Hard in Practice

The hardest part was not any single feature. The hard part was enforcing global ordering constraints across subsystems that were each individually "almost correct".

Typical failure pattern:

- relocation looked correct in isolation
- TLS looked correct in isolation
- constructor order looked correct in isolation
- process still crashed because one startup-global pointer was initialized one phase too late

`rustld` matured by eliminating these ordering races and state mismatches one by one, with regression testing after each critical change.

## 26. Build and Test Matrix Summary

The implemented matrix today is:

- static ELF: supported
- dynamic ELF (glibc): supported for broad command workloads
- dynamic ELF (musl): supported with interpreter-aware handling
- x86_64: native support
- aarch64: support via cross-build and qemu user-mode validation
- Rust API: first-class
- C API: first-class (`include/rustld.h` + `src/c_api.rs`)

For flow-level diagrams, see `docs/graph.md`.
For lower-level subsystem detail, see `docs/TECHNICAL_EXPLANATION.md`.

## 27. Representative End-to-End Call Chain

A typical dynamic run using Rust API looks like this:

```rust
let loader = ElfLoader::new();
unsafe {
    loader.execute_from_bytes(
        elf_bytes,
        vec!["/bin/ls".to_string(), "-la".to_string()],
        None, // inherit env
        None, // inherit auxv
        false,
    );
}
```

Internally, this expands to:

- parse argv and optional overrides
- derive runtime metadata from auxv
- load target and dependencies
- relocate all objects with deferred resolver/copy phases
- build/install TLS and update thread pointer
- run constructors in dependency-safe order
- rebuild startup frame
- jump to target entry

## 28. Research Takeaways

Three lessons stood out during implementation:

1. Loader engineering is mostly about state coherence across phases, not about one "big" algorithm.
2. TLS is where many loaders fail once you move beyond trivial binaries.
3. Architecture separation (`src/arch/*`) is critical; without it, correctness changes become unmanageable.

## 29. Conclusion

`rustld` is now a practical user-space loader with real binary coverage, architecture split, glibc/musl handling, and embedding APIs.

The work was not linear. It involved repeated deep debugging across startup ABI, symbol resolution, TLS layout, runtime linker contract emulation, and architecture-specific relocation behavior.

The current codebase is not a toy linker. It is a runtime system that reconstructs enough of the Linux process startup contract to execute real software from user space, while remaining programmatically controllable from Rust and C.
