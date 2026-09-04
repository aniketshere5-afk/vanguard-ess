# ML Methodology

The current prototype uses robust statistics and an interpretable linear drift forecast. Initial peer evidence is summarized with the median, MAD, and IQR. Robust z-score is `0.6745 × (component − lot median) / MAD` when MAD is non-zero. A normalized anomaly score prioritizes robust deviation and uses a bounded outlier check; insufficient lots do not receive a confident anomaly score.

The 168h forecast uses only observations through 24h. Its interval is derived from peer residual scale, and the UI distinguishes forecast from measured data. Boundary crossing is evaluated against the configurable lot safety boundary. The risk score weights are 8% static compliance, 28% dynamic evidence, 24% drift, 25% boundary proximity, and 15% uncertainty. These are prototype configuration values, not universal engineering standards.

Evaluation metadata is persisted with the model version. Production calibration should use lot-aware and temporal holdouts, with recall, false-negative rate, precision, F1, MAE, RMSE, and R² reported together. No real ISRO dataset or production claim is made.
