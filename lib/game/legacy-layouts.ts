// Exact layout-v2 descriptors for decoding saved active claims.
import type { BlockSpec } from "./campaign-content";
export const LEGACY_V2_BLOCKS: BlockSpec[] = [
  {
    "id": "claim-01",
    "name": "First claim",
    "profile": "parcel",
    "scale": 0.34,
    "lots": 2,
    "value": 1,
    "chapter": 1,
    "phases": 3,
    "layers": [
      "parcel",
      "parcel",
      "slab"
    ],
    "hint": "A small claim. Work around each object."
  },
  {
    "id": "claim-02",
    "name": "Petty cash",
    "profile": "parcel",
    "scale": 0.5,
    "lots": 3,
    "value": 1,
    "chapter": 1,
    "phases": 3,
    "layers": [
      "parcel",
      "slab",
      "slab"
    ],
    "hint": "A small claim. Work around each object."
  },
  {
    "id": "claim-03",
    "name": "Personal effects",
    "profile": "slab",
    "scale": 0.66,
    "lots": 3,
    "value": 1,
    "chapter": 1,
    "phases": 3,
    "layers": [
      "slab",
      "parcel",
      "tower"
    ],
    "hint": "Broad and shallow. Open one side, then turn the tray."
  },
  {
    "id": "claim-04",
    "name": "Counter deposit",
    "profile": "tower",
    "scale": 0.82,
    "lots": 4,
    "value": 1,
    "chapter": 1,
    "phases": 3,
    "layers": [
      "tower",
      "slab",
      "tower"
    ],
    "hint": "Clear the lower restraints before the upper holdings."
  },
  {
    "id": "claim-05",
    "name": "Wrong account",
    "profile": "archive",
    "scale": 0.98,
    "lots": 4,
    "value": 1,
    "object": "tag",
    "chapter": 1,
    "phases": 3,
    "layers": [
      "archive",
      "slab",
      "tower"
    ],
    "hint": "Separate shelves protect the records. Work one compartment at a time."
  },
  {
    "id": "claim-06",
    "name": "Pooled custody",
    "profile": "slab",
    "scale": 1,
    "lots": 5,
    "value": 1.3,
    "chapter": 2,
    "phases": 3,
    "layers": [
      "slab",
      "slab",
      "seam"
    ],
    "hint": "Broad and shallow. Open one side, then turn the tray."
  },
  {
    "id": "claim-07",
    "name": "Maintenance lot",
    "profile": "seam",
    "scale": 1.04,
    "lots": 5,
    "value": 1.5,
    "chapter": 2,
    "phases": 3,
    "layers": [
      "seam",
      "slab",
      "tower"
    ],
    "hint": "Follow the visible center seam for a deeper opening."
  },
  {
    "id": "claim-08",
    "name": "Estate effects",
    "profile": "wings",
    "scale": 1.06,
    "lots": 5,
    "value": 1.6,
    "optional": "ring",
    "chapter": 2,
    "phases": 3,
    "layers": [
      "wings",
      "slab",
      "seam"
    ],
    "hint": "The wings share narrow supports. Sever the supports."
  },
  {
    "id": "claim-09",
    "name": "Mixed identifiers",
    "profile": "tower",
    "scale": 1.1,
    "lots": 6,
    "value": 1.7,
    "chapter": 2,
    "phases": 3,
    "layers": [
      "tower",
      "slab",
      "tower"
    ],
    "hint": "Clear the lower restraints before the upper holdings."
  },
  {
    "id": "claim-10",
    "name": "Sealed cash",
    "profile": "archive",
    "scale": 1.13,
    "lots": 6,
    "value": 1.8,
    "chapter": 2,
    "phases": 3,
    "layers": [
      "archive",
      "slab",
      "seam"
    ],
    "hint": "Separate shelves protect the records. Work one compartment at a time."
  },
  {
    "id": "claim-11",
    "name": "Internal review",
    "profile": "seam",
    "scale": 1.16,
    "lots": 6,
    "value": 2,
    "object": "hold",
    "chapter": 2,
    "phases": 3,
    "layers": [
      "seam",
      "wings",
      "seam"
    ],
    "hint": "Follow the visible center seam for a deeper opening."
  },
  {
    "id": "claim-12",
    "name": "Inventory variance",
    "profile": "slab",
    "scale": 1.2,
    "lots": 6,
    "value": 2.2,
    "chapter": 3,
    "phases": 3,
    "layers": [
      "slab",
      "wings",
      "archive"
    ],
    "hint": "Broad and shallow. Open one side, then turn the tray."
  },
  {
    "id": "claim-13",
    "name": "Emergency access",
    "profile": "wings",
    "scale": 1.25,
    "lots": 7,
    "value": 2.4,
    "chapter": 3,
    "phases": 3,
    "layers": [
      "wings",
      "wings",
      "seam"
    ],
    "hint": "The wings share narrow supports. Sever the supports."
  },
  {
    "id": "claim-14",
    "name": "Bearer instruments",
    "profile": "tower",
    "scale": 1.28,
    "lots": 7,
    "value": 2.5,
    "chapter": 3,
    "phases": 3,
    "layers": [
      "tower",
      "wings",
      "archive"
    ],
    "hint": "Clear the lower restraints before the upper holdings."
  },
  {
    "id": "claim-15",
    "name": "Exception inventory",
    "profile": "archive",
    "scale": 1.32,
    "lots": 7,
    "value": 2.7,
    "chapter": 3,
    "phases": 3,
    "layers": [
      "archive",
      "wings",
      "seam"
    ],
    "hint": "Separate shelves protect the records. Work one compartment at a time."
  },
  {
    "id": "claim-16",
    "name": "Brittle annex",
    "profile": "wings",
    "scale": 1.35,
    "lots": 8,
    "value": 2.8,
    "chapter": 3,
    "phases": 3,
    "layers": [
      "wings",
      "wings",
      "archive"
    ],
    "hint": "The wings share narrow supports. Sever the supports."
  },
  {
    "id": "claim-17",
    "name": "Withheld release",
    "profile": "seam",
    "scale": 1.4,
    "lots": 8,
    "value": 3,
    "chapter": 3,
    "phases": 3,
    "layers": [
      "seam",
      "wings",
      "seam"
    ],
    "hint": "Follow the visible center seam for a deeper opening."
  },
  {
    "id": "claim-18",
    "name": "Exception 7C",
    "profile": "archive",
    "scale": 1.45,
    "lots": 8,
    "value": 3.2,
    "object": "log",
    "chapter": 3,
    "phases": 3,
    "layers": [
      "archive",
      "wings",
      "archive"
    ],
    "hint": "Separate shelves protect the records. Work one compartment at a time."
  },
  {
    "id": "claim-19",
    "name": "Downstairs equipment",
    "profile": "tower",
    "scale": 1.5,
    "lots": 8,
    "value": 3.5,
    "chapter": 4,
    "phases": 3,
    "layers": [
      "tower",
      "archive",
      "wings"
    ],
    "hint": "Clear the lower restraints before the upper holdings."
  },
  {
    "id": "claim-20",
    "name": "Service channel",
    "profile": "seam",
    "scale": 1.55,
    "lots": 9,
    "value": 3.8,
    "chapter": 4,
    "phases": 3,
    "layers": [
      "seam",
      "archive",
      "tower"
    ],
    "hint": "Follow the visible center seam for a deeper opening."
  },
  {
    "id": "claim-21",
    "name": "Preservation machinery",
    "profile": "wings",
    "scale": 1.58,
    "lots": 9,
    "value": 4,
    "chapter": 4,
    "phases": 3,
    "layers": [
      "wings",
      "archive",
      "wings"
    ],
    "hint": "The wings share narrow supports. Sever the supports."
  },
  {
    "id": "claim-22",
    "name": "Thermal service",
    "profile": "archive",
    "scale": 1.62,
    "lots": 9,
    "value": 4.3,
    "chapter": 4,
    "phases": 3,
    "layers": [
      "archive",
      "archive",
      "tower"
    ],
    "hint": "Separate shelves protect the records. Work one compartment at a time."
  },
  {
    "id": "claim-23",
    "name": "Unreleased holdings",
    "profile": "slab",
    "scale": 1.67,
    "lots": 10,
    "value": 4.5,
    "chapter": 4,
    "phases": 3,
    "layers": [
      "slab",
      "archive",
      "wings"
    ],
    "hint": "Broad and shallow. Open one side, then turn the tray."
  },
  {
    "id": "claim-24",
    "name": "Liability archive",
    "profile": "seam",
    "scale": 1.7,
    "lots": 10,
    "value": 4.8,
    "chapter": 4,
    "phases": 3,
    "layers": [
      "seam",
      "archive",
      "tower"
    ],
    "hint": "Follow the visible center seam for a deeper opening."
  },
  {
    "id": "claim-25",
    "name": "The remaining route",
    "profile": "archive",
    "scale": 1.75,
    "lots": 10,
    "value": 5,
    "object": "access",
    "chapter": 4,
    "phases": 2,
    "layers": [
      "archive",
      "archive"
    ],
    "hint": "Separate shelves protect the records. Work one compartment at a time."
  },
  {
    "id": "claim-26",
    "name": "Sublevel B intake",
    "profile": "tower",
    "scale": 1.8,
    "lots": 10,
    "value": 5.4,
    "chapter": 5,
    "phases": 2,
    "layers": [
      "tower",
      "seam"
    ],
    "hint": "Clear the lower restraints before the upper holdings."
  },
  {
    "id": "claim-27",
    "name": "Prestige custody",
    "profile": "wings",
    "scale": 1.85,
    "lots": 11,
    "value": 5.8,
    "chapter": 5,
    "phases": 2,
    "layers": [
      "wings",
      "seam"
    ],
    "hint": "The wings share narrow supports. Sever the supports."
  },
  {
    "id": "claim-28",
    "name": "Manual clearance",
    "profile": "seam",
    "scale": 1.9,
    "lots": 11,
    "value": 6,
    "chapter": 5,
    "phases": 2,
    "layers": [
      "seam",
      "seam"
    ],
    "hint": "Follow the visible center seam for a deeper opening."
  },
  {
    "id": "claim-29",
    "name": "Master records",
    "profile": "archive",
    "scale": 1.95,
    "lots": 12,
    "value": 6.2,
    "chapter": 5,
    "phases": 2,
    "layers": [
      "archive",
      "seam"
    ],
    "hint": "Separate shelves protect the records. Work one compartment at a time."
  },
  {
    "id": "claim-30",
    "name": "Last holdings",
    "profile": "slab",
    "scale": 2,
    "lots": 12,
    "value": 6.5,
    "chapter": 5,
    "phases": 2,
    "layers": [
      "slab",
      "seam"
    ],
    "hint": "Broad and shallow. Open one side, then turn the tray."
  },
  {
    "id": "claim-31",
    "name": "Archive antechamber",
    "profile": "wings",
    "scale": 2.05,
    "lots": 12,
    "value": 7,
    "chapter": 5,
    "phases": 2,
    "layers": [
      "wings",
      "seam"
    ],
    "hint": "The wings share narrow supports. Sever the supports."
  },
  {
    "id": "claim-32",
    "name": "The Vault",
    "profile": "vault",
    "scale": 2.15,
    "lots": 14,
    "value": 8,
    "object": "ledger",
    "chapter": 5,
    "phases": 3,
    "layers": [
      "wings",
      "seam",
      "archive"
    ],
    "hint": "Outer supports → service channels → sealed archive. Change tools for each layer."
  }
];
