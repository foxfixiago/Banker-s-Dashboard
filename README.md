# 🖥️ OS Deadlock Analysis & Resource Allocation Dashboard

An interactive, modular web simulator for Operating Systems resource allocation, **Banker's Algorithm (Deadlock Avoidance)**, **Multiple-Instance Deadlock Detection & Recovery**, and **Deadlock Prevention Policy Analysis**.

🔗 **Repository:** `github.com/foxfixiago/Banker-s-Dashboard`

---

## ✨ Key Features

- **5 Non-Interchangeable Semantic System States:** Clearly distinguishes between **Safe State**, **Waiting / Deferred**, **Unsafe (Denied & Restored)**, **Confirmed Deadlock**, and **Invalid / Boundary Input** states.
- **Modular Scenario-Specific Workspace:** Each analytical scenario runs in its own isolated tab with dedicated controls, matrices, and diagnostic traces.
- **Dynamic Matrix Engine:** Automatically computes `Need = Maximum − Allocation` and traces step-by-step `Work = Work + Allocationᵢ` vector progressions.
- **Interactive SVG Resource-Allocation Graph (RAG):** Visualizes allocation edges (`Rⱼ → Pᵢ`) and request edges (`Pᵢ → Rⱼ`) with live victim process termination recovery.

---

## 🧭 Scenario Modules Overview

| Module | Scenario Focus | Core Mechanism Demonstrated |
| :--- | :--- | :--- |
| **Scenario A** | **Safe State** | Configures `Allocation`, `Maximum`, and `Available = [3, 3, 2]`, auto-calculates `Need`, and verifies the safe sequence `< P1 → P3 → P4 → P0 → P2 >`. |
| **Scenario B** | **Exceeds Available** | Evaluates a legitimate request (`P0` requests `[0, 4, 0]`) where `Request ≤ Need` passes but `Request > Available`, placing the process in a **Waiting / Deferred** state with matrices unchanged. |
| **Scenario C** | **Unsafe Request** | Simulates a temporary allocation (`P4` requests `[3, 3, 0]`), proves no safe sequence exists at `Available' = [0, 0, 2]`, denies the request, and rolls back to the original safe state. |
| **Scenario D** | **Detection & Recovery** | Uses `Allocation` and active `Request (Q)` matrices to contrast a **Confirmed Circular Wait Deadlock** against a **Cycle Without Deadlock**, plus one-click process termination recovery. |
| **Scenario E** | **Prevention Policies** | Compares unconstrained allocation against **Fixed Resource Ordering**, **All-at-Once Pre-Claiming**, and **Forced Preemption** with quantitative utilization and concurrency trade-offs. |
| **Scenario F** | **Boundary & Invalid** | Verification suite testing valid boundary cases (`Available = [0,0,0]`, `Need = [0,0,0]`) against invalid inputs (`PID = P99`, negative requests, `Request > Need`, `Allocation > Max`). |
| **Analysis & Logs** | **TC1–TC6 & Concepts** | Complete analytical evaluation table (`TC1–TC6`), AI development verification log, and core OS architectural Q&A. |

---

## 📂 Project Structure

```text
Banker-s-Dashboard/
├── index.html   # Modular 7-tab interface and semantic status banner layout
├── style.css    # Dark glassmorphism UI theme and 5 semantic state color palettes
├── script.js    # Banker's Safety, Resource-Request, Detection, SVG RAG & Validation engines
└── README.md    # Project documentation
