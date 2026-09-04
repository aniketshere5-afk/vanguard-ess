# Data Schema

The schema contains users, lots, components, measurements, analysis runs, investigations, decisions, audit logs, and model versions. Lots own components; components own time-indexed measurements; analyses point to components and model versions; investigations point to components; decisions point to investigations and users; audit logs point to actors when available.

Unique constraints protect lot codes, component codes, and component/checkpoint pairs. Foreign keys preserve referential integrity. Analytical result JSON is retained with the analysis run so a later model recalculation does not erase the evidence used in a historical review.
