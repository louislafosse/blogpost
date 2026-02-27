# The Ghost in the Allocator

> "In the fog of complex drivers, we sometimes forget that *free* does not mean *gone*."

**Date:** Oct 31, 2025 · **Category:** Kernel Exploitation · **Tags:** `kernel` `heap` `use-after-free` `exploitation`

---

## Background

There is a certain melancholy in the lifecycle of a memory block. It is born, it serves a purpose, and it is freed. But in the fog of complex drivers, we sometimes forget that *free* does not mean *gone*.

Like a letter sent to an address that no longer exists, writing to a freed pointer invokes undefined behavior — the modern equivalent of chaos.

## The Vulnerability

The driver in question maintained a list of `Wanderer` objects allocated from the kernel heap. On a specific ioctl path, the object would be freed but the reference removed only on the next GC cycle — leaving a live pointer dangling in a shared list.

```c
/* The dangling pointer remains... */
struct Wanderer *ptr = kmalloc(sizeof(struct Wanderer));
kfree(ptr);

/* ...waiting for a new object to occupy the space */
ptr->vision = 0xDEADBEEF; // The UAF trigger
```

By carefully grooming the heap, we can place our own malicious object in that void, turning a crash into execution.

## Heap Grooming

The strategy is to flood the allocator with objects of the same size class as `struct Wanderer`, then trigger the free. The slab allocator will hand out our spray objects in that slot on the next allocation.

```c
// Spray objects of matching size
for (int i = 0; i < 512; i++) {
    spray[i] = kmalloc(sizeof(struct Wanderer));
    memcpy(spray[i], &fake_obj, sizeof(fake_obj));
}
```

## Exploitation Path

1. Trigger the vulnerable free path
2. Spray the heap with controlled objects
3. Invoke the dangling pointer write — it now targets our fake object
4. Pivot to a function pointer overwrite → kernel code execution

## Mitigation

- `SLAB_TYPESAFE_BY_RCU` prevents immediate reuse across RCU grace periods
- Pointer poisoning (`0xDEAD000000000000`) catches use-after-free on dereference
- Kernel ASLR + CFI limits the spray → pivot chain

---

*By carefully grooming the heap, we can place our own malicious object in that void, turning a crash into execution.*
