"""Standalone, reproducible Matplotlib QA figures from the report's portable JSON."""
import json
import os
import sys
from pathlib import Path

local_packages = Path(__file__).resolve().parent.parent / "qa-artifacts" / "major-report-python"
if local_packages.exists():
    sys.path.insert(0, str(local_packages))
plot_cache = local_packages.parent / "major-report-matplotlib"
plot_cache.mkdir(parents=True, exist_ok=True)
os.environ.setdefault("MPLCONFIGDIR", str(plot_cache))

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np


data = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
out = Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
plt.rcParams.update({
    "font.family": "DejaVu Sans", "font.size": 10, "axes.titlesize": 16,
    "axes.labelsize": 11, "figure.facecolor": "#faf9f4", "axes.facecolor": "#faf9f4",
    "axes.spines.top": False, "axes.spines.right": False,
    "axes.edgecolor": "#60706d", "text.color": "#20332d", "axes.labelcolor": "#20332d",
    "xtick.color": "#40514c", "ytick.color": "#40514c", "svg.fonttype": "none",
})
colors = {"saver": "#887349", "power": "#b35646", "speed": "#d09136", "control": "#45775d",
          "technique": "#6c67a3", "mixed": "#256e86", "cheapest": "#ab6686", "inefficient": "#737b7d", "upgrader": "#bf7055"}
deliveries = data["deliveries"]
xs = np.array([d["delivery"] for d in deliveries])
stamp = data["generatedAt"][:19].replace("T", " ") + " UTC"


def begin(title, ylabel, figsize=(13, 5.6)):
    fig, ax = plt.subplots(figsize=figsize)
    ax.set_title(title, loc="left", pad=20, fontweight="bold")
    ax.set_ylabel(ylabel)
    ax.grid(axis="y", color="#d6ded8", linewidth=.7, zorder=0)
    ax.set_axisbelow(True)
    return fig, ax


def delivery_axis(ax):
    ax.set_xlim(.4, 32.6)
    ax.set_xticks([1, 4, 8, 12, 16, 20, 24, 28, 32])
    ax.set_xlabel("Delivery")
    for boundary in [5.5, 11.5, 18.5, 25.5]:
        ax.axvline(boundary, color="#cdd6cf", lw=.8, linestyle=":")


def finish(fig, name, caption):
    fig.subplots_adjust(bottom=.22, top=.85, left=.075, right=.97)
    fig.text(.075, .07, caption, fontsize=9, color="#53635e", wrap=True)
    fig.text(.075, .027, "Frozen Assets QA · " + stamp, fontsize=8, color="#718078")
    fig.savefig(out / (name + ".svg"), bbox_inches="tight")
    fig.savefig(out / (name + ".png"), dpi=150, bbox_inches="tight")
    plt.close(fig)


def run_note(policy="mixed"):
    run = data["runs"].get(policy)
    return run["status"] if run else "No measured run available."


fig, ax = begin("Solid field samples by delivery", "Solid samples across all phases")
baseline = [(d.get("baseline") or {}).get("solidAcrossPhases", np.nan) for d in deliveries]
current = [d["solidAcrossPhases"] for d in deliveries]
ax.plot(xs, baseline, color="#a3aaa0", label="Frozen baseline", linewidth=2)
ax.bar(xs, current, color="#477f78", alpha=.82, label="Current authored geometry", width=.7)
delivery_axis(ax)
ax.legend(loc="upper left", frameon=False)
finish(fig, "physical-volume", "Solid means density >0.5 after cargo pockets; all physical phases are summed. Current cell size is constant 0.30.\nLegacy spacing varied, so this compares sampled work topology rather than equal world-volume units.")

fig, ax = begin("Active ice work: intent and observed replay", "Active seconds per delivery")
mins = [d["targetActiveSeconds"]["min"] for d in deliveries]
maxs = [d["targetActiveSeconds"]["max"] for d in deliveries]
ax.fill_between(xs, mins, maxs, color="#d7c896", alpha=.65, label="Authored delivery band")
measured = [(d.get("mixed") or {}).get("activeSeconds", np.nan) for d in deliveries]
if any(np.isfinite(measured)):
    ax.plot(xs, measured, color=colors["mixed"], marker="o", markersize=3.5, linewidth=1.8, label="Selected Mixed replay")
baseline_active = [(d.get("baseline") or {}).get("measuredMixedActiveSeconds", np.nan) for d in deliveries]
ax.plot(xs, baseline_active, color="#8d978f", linestyle="--", linewidth=1.3, label="Frozen baseline active replay")
for purchase in data["purchases"]:
    if purchase["policy"] != "mixed" or purchase["purchaseDelivery"] is None:
        continue
    delivery = purchase["purchaseDelivery"]
    ax.axvline(delivery, color="#547986", lw=.8, alpha=.55, linestyle=":")
    ax.annotate(purchase["name"], (delivery, measured[delivery - 1]),
                xytext=(5, 14), textcoords="offset points", fontsize=8,
                color="#365661", rotation=18,
                bbox=dict(boxstyle="round,pad=.2", fc="#f8f7f2", ec="none", alpha=.9))
delivery_axis(ax)
ax.legend(loc="upper left", frameon=False)
finish(fig, "active-time", "Mixed: " + run_note() + "\nTargets are intent, not measured time. The overall 45–55-minute target takes priority over the longer sum of delivery bands.")

fig, ax = begin("Recovered funds retained after each delivery", "Funds on hand ($)")
count = 0
for policy in colors:
    run = data["runs"].get(policy)
    if not run:
        continue
    rows = run.get("deliveries", [])
    if not rows:
        continue
    ax.plot([r.get("block", r.get("delivery")) for r in rows], [r.get("moneyLeaving", np.nan) for r in rows],
            label=policy.title(), color=colors[policy], linewidth=1.7, marker="o", markersize=2.4)
    count += 1
if count:
    ax.legend(loc="upper left", ncol=4, frameon=False)
else:
    ax.text(.5, .5, "Policy balance runs pending", ha="center", va="center", transform=ax.transAxes)
delivery_axis(ax)
finish(fig, "money", "Observed funds after purchases and commission. Missing policies are not extrapolated.\nRun stage/source freshness is listed in the Markdown and portable data.")

fig, ax = begin("When major equipment was purchased", "", figsize=(13, 6.2))
tool_order = ["pick", "heavy", "sledge", "breaker", "thermal"]
tool_names = ["Ice pick", "Heavy pick", "Sledgehammer", "Powered breaker", "Thermal tool"]
available = [p for p in colors if any(r["policy"] == p and r["purchaseExperienceMinute"] is not None for r in data["purchases"])]
for pi, policy in enumerate(available):
    rows = [r for r in data["purchases"] if r["policy"] == policy and r["purchaseExperienceMinute"] is not None]
    for r in rows:
        y = tool_order.index(r["tool"]) + (pi - (len(available) - 1) / 2) * .075
        ax.scatter(r["purchaseExperienceMinute"], y, color=colors[policy], s=55, label=policy.title() if r == rows[0] else None, zorder=4)
        if len(available) <= 2:
            ax.annotate(f'D{r["purchaseDelivery"]} · {r["purchaseExperienceMinute"]:.1f}m', (r["purchaseExperienceMinute"], y), xytext=(6, 7), textcoords="offset points", fontsize=9)
if available:
    ax.legend(loc="upper right", frameon=False, ncol=4)
else:
    ax.text(.5, .5, "Major tool purchase measurements pending", ha="center", va="center", transform=ax.transAxes)
ax.set_yticks(range(5), tool_names)
ax.invert_yaxis()
ax.set_xlabel("Modeled experience minute (observed work + explicit first-time overhead)")
ax.set_xlim(0, (max((p["purchaseExperienceMinute"] or 0 for p in data["purchases"]), default=60) or 60) * 1.18)
finish(fig, "tool-purchases", "Purchase timing is read from logged tool transactions; tutorial and browsing assumptions remain visible in the report.\nFinal source-matched policy timings are required before treating this as acceptance.")

fig, ax = begin("Condition at physical recovery", "Condition (0–100)", figsize=(13, 5.9))
condition_groups = []
labels = []
for policy in colors:
    values = [a["condition"] for a in data["awards"] if a["policy"] == policy and isinstance(a.get("condition"), (int, float))]
    if values:
        condition_groups.append(values)
        labels.append(policy)
ax.axhspan(90, 100, color="#dce8d6", alpha=.6, label="Pristine ≥90")
ax.axhline(75, color="#baaa6d", linestyle="--", linewidth=1)
ax.axhline(55, color="#b69182", linestyle=":", linewidth=1)
if labels:
    bp = ax.boxplot(condition_groups, tick_labels=[p.title() for p in labels], patch_artist=True, widths=.45, showmeans=True)
    for patch, policy in zip(bp["boxes"], labels):
        patch.set_facecolor(colors[policy])
        patch.set_alpha(.65)
else:
    ax.text(.5, .5, "Condition award logs pending", ha="center", va="center", transform=ax.transAxes)
ax.set_ylim(0, 102)
ax.legend(loc="lower right", frameon=False)
finish(fig, "condition", "Distribution of logged economic cargo at physical release; base money is never reduced.\nMissing policies remain pending. Box/whisker plots expose distribution, not merely a favorable mean.")
print("Wrote five Matplotlib SVG/PNG figure pairs.")
