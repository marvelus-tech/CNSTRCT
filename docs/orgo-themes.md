# Orgo themes and CNSTRCT templates (P14 spike)

**Decision: ready for P15 to P16** using Orgo **Templates** at computer create time, not a separate post-boot theme paint API.

## What Orgo exposes

From [Orgo docs](https://docs.orgo.ai/llms-full.txt):

- **Templates** are reproducible computer definitions (`orgo templates list`, `templates run`, publish on Scale+).
- **Create computer** accepts `template` by name or ref, e.g. `hermes-agent` or `system/hermes-agent@1.1.16` ([create computer](https://docs.orgo.ai/api-reference/computers/create)).
- **Resolution** defaults to `1280x720` unless the template sets otherwise.
- There is no first-class "set desktop wallpaper theme" REST field in the spike. Visual differences come from **which template launches the desk**.

## CNSTRCT mapping (planned P15)

| `templateId` (BizOS) | Orgo template ref (placeholder) | Notes |
| --- | --- | --- |
| `home-services` | `cnstrct-home-services` | Create with `POST /computers` + `template` field |
| `mobile-detailing` | `cnstrct-mobile-detailing` | Distinct packages/wallpaper in template YAML |
| `estate-clearance` | TBD | Not live yet |

**Account inventory:** populate name/ID rows in Vercel ops when templates are published to the Orgo team account. Until then, provisioning keeps the current blank Linux desk (`cpu` 2, `ram` 8) and theme apply stays a no-op.

## Apply strategy (P16)

1. After desk `running`, idempotently call create with template only when computer missing (today's flow), or
2. **Preferred:** pass `template` on initial `orgo.createComputer` once templates exist, store `orgo_theme_key` on the business row for UI.

**Fallback:** bash bootstrap on the VM is out of scope unless template publish is blocked; document blockers in the P16 PR if templates are not published.

## Blockers

- Publishing custom templates requires Orgo **Scale** plan on the workspace owner account.
- Template names must be validated in the Orgo dashboard before hard-coding refs in `src/lib/agent/orgo-themes.ts` (P15).