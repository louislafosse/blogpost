# Entropy & The Sublime

> "The seed was not drawn from the noise of the universe, but from the silence of `time(0)`."

**Date:** Sep 15, 2025 · **Category:** Cryptography · **Tags:** `cryptography` `prng` `iot` `firmware`

---

## The Painting

Friedrich painted the sublime as an overwhelming experience of nature — the *Wanderer above the Sea of Fog*, standing at the edge of something incomprehensibly vast. In cryptography, the sublime is true randomness. A source of entropy so deep, so chaotic, that no adversary could ever predict the next bit.

When I extracted and analyzed the firmware of a generic IoT camera purchased from an unnamed marketplace, I found not chaos, but order.

## The Firmware

```bash
$ binwalk -e firmware.bin
$ strings squashfs-root/usr/sbin/daemon | grep -i seed
```

The output was immediate and damning:

```c
srand(time(0));
int key = rand();
```

The session key — used to encrypt the video stream — was seeded with the Unix timestamp at boot. Predictable to within a second.

## The Attack

An attacker on the same network can:

1. Observe the first encrypted packet (timestamp of device boot is inferrable from DHCP/mDNS)
2. Brute-force `srand(t)` for ±30 seconds around the observed boot time
3. Reconstruct the key stream entirely

```python
import ctypes, time

libc = ctypes.CDLL("libc.so.6")

# Try all timestamps within a 60-second window
for t in range(observed_boot - 30, observed_boot + 30):
    libc.srand(t)
    candidate_key = libc.rand()
    if try_decrypt(stream, candidate_key):
        print(f"Key found: {candidate_key:#010x} (seed={t})")
        break
```

## Proper Entropy Sources

| Source | Quality | Notes |
|--------|---------|-------|
| `/dev/urandom` | High | Non-blocking, suitable for keys |
| `getrandom()` syscall | High | Preferred in modern Linux |
| Hardware RNG (`/dev/hwrng`) | Very High | When available |
| `time(0)` | None | Never use for cryptography |

## Conclusion

The sublime is not seeded by a wall clock. True randomness is everywhere — in thermal noise, in interrupt timing jitter, in the quantum uncertainty of your hardware. The kernel has been harvesting it for you since boot. Use it.

```c
// The correct way
#include <sys/random.h>

uint8_t key[32];
getrandom(key, sizeof(key), 0);
```

---

*When I analyzed the firmware of the generic IoT camera, I found not chaos, but order. The seed was `time(0)`.*
