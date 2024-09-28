import pandas as pd
import numpy as np

# Load eye coordinates from CSV
eye_coordinates_file = "eye_coordinates.csv"
df = pd.read_csv(eye_coordinates_file)

# Parameters for fixation and saccade detection
fixation_threshold = 5  # px (example threshold for fixation detection)
saccade_threshold = 10  # px (example threshold for saccade detection)

# Initialize lists to store fixations and saccades
fixations = []
saccades = []

# Iterate through the DataFrame to detect fixations and saccades
previous_row = None

for index, row in df.iterrows():
    if previous_row is not None:
        # Calculate differences in pupil coordinates
        lx_diff = abs(row["LX"] - previous_row["LX"])
        ly_diff = abs(row["LY"] - previous_row["LY"])
        rx_diff = abs(row["RX"] - previous_row["RX"])
        ry_diff = abs(row["RY"] - previous_row["RY"])

        # Detect saccades
        if (
            (lx_diff > saccade_threshold)
            or (ly_diff > saccade_threshold)
            or (rx_diff > saccade_threshold)
            or (ry_diff > saccade_threshold)
        ):
            saccades.append(
                {
                    "StartX": previous_row["LX"],
                    "StartY": previous_row["LY"],
                    "EndX": row["LX"],
                    "EndY": row["LY"],
                    "Label": 1,  # Placeholder for labeling (update logic as needed)
                }
            )

        # Detect fixations
        if (
            (lx_diff <= fixation_threshold)
            and (ly_diff <= fixation_threshold)
            and (rx_diff <= fixation_threshold)
            and (ry_diff <= fixation_threshold)
        ):
            fixations.append(
                {
                    "T": row["T"],
                    "LX": row["LX"],
                    "LY": row["LY"],
                    "RX": row["RX"],
                    "RY": row["RY"],
                }
            )

    previous_row = row

# Convert lists to DataFrames
fixations_df = pd.DataFrame(fixations)
saccades_df = pd.DataFrame(saccades)

# Save fixations and saccades to separate CSV files
fixations_output_path = "fixations_data.csv"
saccades_output_path = "saccades_data.csv"

fixations_df.to_csv(fixations_output_path, index=False)
print(f"Fixations data saved to {fixations_output_path}")

saccades_df.to_csv(saccades_output_path, index=False)
print(f"Saccades data saved to {saccades_output_path}")

# Merge fixations and saccades into a single DataFrame
merged_df = pd.merge(
    fixations_df, saccades_df, left_index=True, right_index=True, how="outer"
)

# Save merged data to a CSV file
merged_output_path = "merged.csv"
merged_df.to_csv(merged_output_path, index=False)
print(f"Merged data saved to {merged_output_path}")
