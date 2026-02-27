# Obscurity is not Safety

> "The wind always blows eventually."

**Date:** Aug 04, 2025 · **Category:** Philosophy · **Tags:** `philosophy` `security` `obscurity` `essay`

---

## The Fog

Standing above the sea of fog, one cannot see the path below. Yet, the path exists. The mountain does not cease to have slopes because a painter chose to obscure them in his composition.

Security through obscurity relies on the fog remaining forever. But the wind always blows eventually.

## A Definition

*Security through obscurity* is the practice of deriving protection from the concealment of a system's internals — its source code, its protocols, its architecture — rather than from the mathematical soundness of its design.

It is not inherently wrong to keep secrets. The location of your safe is a legitimate secret. The combination should be the cryptographic primitive.

The failure comes when the combination *is* the location.

## Historical Lessons

**CSS — Content Scrambling System (1999)**
DVD copy protection relied on the algorithm being secret. Within months of hardware reverse engineering, DeCSS was published. The algorithm was weak *and* obscure. The obscurity bought time measured in months; a sound algorithm would have bought decades.

**Dual EC DRBG (2006)**
A random number generator standardized by NIST with parameters nobody could explain. Years later, Snowden documents suggested a backdoor. The obscurity of the constants — never openly derived — was the entire attack surface.

**Proprietary firmware (ongoing)**
Every week, researchers extract firmware from routers, cameras, and industrial controllers. Closed source provides no fundamental barrier. It provides friction — measured in hours to days for a motivated analyst.

## The Kerckhoffs Principle

Auguste Kerckhoffs stated it in 1883:

> *A cryptosystem should be secure even if everything about the system, except the key, is public knowledge.*

This is not idealism. It is engineering discipline. It forces designers to put the security where it belongs — in the key, in the algorithm, in the protocol — not in the hope that nobody looks closely.

## When Obscurity Has Value

Obscurity as a *layer* — not a foundation — has legitimate use:

- **Delaying reconnaissance:** Not advertising your stack slows opportunistic attackers
- **Reducing attack surface visibility:** Honeypots depend on it
- **Protecting implementation details that don't affect security properties**

The error is treating any of these as *primary* defenses.

## Conclusion

The fog is beautiful. Friedrich understood that. But the wanderer does not navigate by the fog — he navigates despite it, knowing the terrain exists whether visible or not.

Your attacker assumes the terrain exists. Build accordingly.

---

*Security through obscurity relies on the fog remaining forever. But the wind always blows eventually.*
