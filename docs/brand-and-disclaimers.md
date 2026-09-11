# Brand and disclaimers

This is a Smart India Hackathon prototype, independently built under the
project name **VanGuard ESS**. It is not affiliated with, endorsed by, or a
system of ISRO or the Government of India.

## Why the visual language, but not the real insignia

The UI is deliberately styled after the visual conventions of Indian
government and aerospace institutional sites — a navy masthead, a tricolour
accent rule, bilingual (Hindi/English) headers, restrained saffron/green
accents, and a satellite/orbit motif — because the product's subject
(component reliability screening for space-program-style hardware) calls for
that register.

What it does **not** do, on purpose:

- **No State Emblem of India.** Reproducing the Lion Capital of Ashoka /
  the State Emblem is restricted by the *State Emblem of India (Prohibition
  of Improper Use) Act, 1950* regardless of context or disclaimers attached.
- **No ISRO logo or wordmark.** Using a real organisation's actual branding —
  even labelled "prototype" — reads as impersonation once the page is shared
  or screenshotted out of context, especially for something deployed to a
  public URL rather than shown only in a pitch deck.
- **No claim to be an official Government of India or ISRO system**, in the
  masthead, the sign-in screen, or the footer.

## What it uses instead

- An original orbit-and-star product mark and a seal-style "Mission
  Assurance" badge — a tricolour-ringed circular graphic with a star/compass
  motif, occupying the position an official emblem would take in a
  government masthead, but not resembling one. Both are branded as
  **VanGuard ESS** in the UI; their component source files
  (`client/src/components/brand/GovSetuMark.tsx` and
  `MissionAssuranceBadge.tsx`) keep an earlier "GovSetu" working name
  internally — that name is never rendered anywhere in the application.
- A persistent **"Smart India Hackathon · Prototype"** strip in the header
  on every page.
- A footer disclaimer on every page: *"Independent hackathon prototype — not
  an official ISRO or Government of India website."*
- A disclaimer line on the sign-in screen itself, so it's visible before a
  visitor even reaches the console.

If this project is ever deployed somewhere it could be mistaken for an
official channel (a `.gov.in` domain, an ISRO-branded subdomain, etc.),
that would cross the line this document describes — don't do that.
