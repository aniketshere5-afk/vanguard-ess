# Model Evaluation

`PRRS-LINEAR-1.0` is stored with model name, type, feature version, dataset identifier, and evaluation metadata. The example metadata is labelled synthetic and describes lot-aware validation. A complete evaluation should use unseen lots or group-aware splits and report regression error alongside recall, false-negative rate, precision, F1, and PR-AUC where appropriate.

The platform intentionally favors interpretable regression and robust evidence over unvalidated deep learning. Any future model must preserve leakage prevention and keep prediction traceability to its version.
