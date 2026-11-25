# Inventory lifecycle flow

```mermaid
flowchart LR
    R[Receipt or approved opening count] --> Q[Inspect and reconcile]
    Q --> S[Rentable stock]
    S --> H[Reserve for rental dates]
    H --> D[Deliver to customer]
    H -->|Cancel before delivery| S
    D --> T[Receive return]
    T --> I[Inspect returned condition]
    I -->|Pass| S
    I -->|Hold| M[Maintenance or quarantine]
    M -->|Approved release| S
    M -->|Approved write-off| X[Disposal]
```

The warehouse operator records each movement in Odoo and the applicable delivery, pickup or inspection evidence in Atlas. The pilot must prove that wrong-location stock, reserved items and quarantined units are excluded from availability. A cancellation releases the approved reservation. A late or damaged return stays outside eligible stock until the system owner confirms release.

[Inventory architecture](../architecture/inventory-and-availability.md) · [Inventory setup checklist](../implementation/02-inventory-setup.md)
