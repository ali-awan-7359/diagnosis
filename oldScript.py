import cv2
import dlib
import numpy as np
import pandas as pd
from math import hypot
from sklearn.cluster import DBSCAN
import matplotlib.pyplot as plt
import seaborn as sns
import os

# Initialize dlib's face detector and the facial landmark predictor
detector = dlib.get_frontal_face_detector()
predictor = dlib.shape_predictor("shape_predictor_68_face_landmarks.dat")

# Initialize video capture
cap = cv2.VideoCapture(0)

# Create DataFrame to store eye coordinates
columns = [
    "Frame",
    "Left Eye H",
    "Left Eye V",
    "Right Eye H",
    "Right Eye V",
    "Avg H",
    "Avg V",
]
data = {
    "Frame": [],
    "Left Eye H": [],
    "Left Eye V": [],
    "Right Eye H": [],
    "Right Eye V": [],
    "Avg H": [],
    "Avg V": [],
}
df = pd.DataFrame(data, columns=columns)

frame_count = 0

# Stop flag file
stop_flag_file = "stop.flag"


def midpoint(p1, p2):
    return int((p1.x + p2.x) / 2), int((p1.y + p2.y) / 2)


def get_pupil_coordinates(eye_points, facial_landmarks, gray_frame):
    eye_region = np.array(
        [
            (facial_landmarks.part(point).x, facial_landmarks.part(point).y)
            for point in eye_points
        ],
        np.int32,
    )
    min_x = np.min(eye_region[:, 0])
    max_x = np.max(eye_region[:, 0])
    min_y = np.min(eye_region[:, 1])
    max_y = np.max(eye_region[:, 1])

    eye = gray_frame[min_y:max_y, min_x:max_x]
    _, threshold_eye = cv2.threshold(eye, 70, 255, cv2.THRESH_BINARY_INV)
    contours, _ = cv2.findContours(
        threshold_eye, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE
    )

    if contours:
        contours = sorted(contours, key=lambda x: cv2.contourArea(x), reverse=True)
        for cnt in contours:
            (x, y, w, h) = cv2.boundingRect(cnt)
            return int(x + w / 2) + min_x, int(y + h / 2) + min_y
    return None, None


while True:
    ret, frame = cap.read()
    frame_count += 1

    if not ret:
        break

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = detector(gray)

    for face in faces:
        landmarks = predictor(gray, face)

        left_pupil_x, left_pupil_y = get_pupil_coordinates(
            (36, 37, 38, 39, 40, 41), landmarks, gray
        )
        right_pupil_x, right_pupil_y = get_pupil_coordinates(
            (42, 43, 44, 45, 46, 47), landmarks, gray
        )

        if left_pupil_x and left_pupil_y:
            cv2.circle(frame, (left_pupil_x, left_pupil_y), 2, (0, 255, 0), -1)
        if right_pupil_x and right_pupil_y:
            cv2.circle(frame, (right_pupil_x, right_pupil_y), 2, (0, 255, 0), -1)

        # Calculate the average of both eyes' horizontal and vertical coordinates
        if left_pupil_x and left_pupil_y and right_pupil_x and right_pupil_y:
            avg_x = (left_pupil_x + right_pupil_x) / 2
            avg_y = (left_pupil_y + right_pupil_y) / 2
        else:
            avg_x, avg_y = None, None

        # Store data
        df = pd.concat(
            [
                df,
                pd.DataFrame(
                    {
                        "Frame": [frame_count],
                        "Left Eye H": [left_pupil_x],
                        "Left Eye V": [left_pupil_y],
                        "Right Eye H": [right_pupil_x],
                        "Right Eye V": [right_pupil_y],
                        "Avg H": [avg_x],
                        "Avg V": [avg_y],
                    }
                ),
            ],
            ignore_index=True,
        )

    cv2.imshow("Frame", frame)

    # Check for stop signal from stop.flag
    if os.path.exists(stop_flag_file):
        print("Stop flag detected. Stopping...")
        break

    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()

# Save the collected data to an Excel file
output_file_path = "eye_coordinates_with_avg.csv"
df.to_excel(output_file_path, index=False)
print(f"Eye coordinates with averaged positions saved to {output_file_path}")


# Detect Fixations using the averaged coordinates
def detect_fixations(df, eps=10, min_samples=1):
    data_avg = df[["Avg H", "Avg V"]].dropna().values
    clustering_avg = DBSCAN(eps=eps, min_samples=min_samples).fit(data_avg)

    df["Fixation"] = -1  # Default to -1 for no cluster
    df.loc[df[["Avg H", "Avg V"]].dropna().index, "Fixation"] = clustering_avg.labels_
    return df


df_with_fixations = detect_fixations(df, eps=15, min_samples=5)
fixations_output_file_path = "eye_coordinates_with_avg_fixations.csv"
df_with_fixations.to_excel(fixations_output_file_path, index=False)
print(f"Eye coordinates with averaged fixations saved to {fixations_output_file_path}")


# Detect Saccades using the averaged coordinates
def detect_saccades(df, distance_threshold=5):
    saccades_avg = []

    for i in range(1, len(df)):
        start_avg = df.iloc[i - 1][["Avg H", "Avg V"]].values
        end_avg = df.iloc[i][["Avg H", "Avg V"]].values
        distance_avg = np.linalg.norm(end_avg - start_avg)

        if distance_avg > distance_threshold:
            saccades_avg.append(
                {
                    "StartX": start_avg[0],
                    "StartY": start_avg[1],
                    "EndX": end_avg[0],
                    "EndY": end_avg[1],
                }
            )

    return pd.DataFrame(saccades_avg)


saccades_avg_df = detect_saccades(df_with_fixations)
saccades_avg_output_file_path = "saccades_data_avg_eye.csv"
saccades_avg_df.to_excel(saccades_avg_output_file_path, index=False)
print(f"Saccades data (averaged) saved to {saccades_avg_output_file_path}")

# Visualization of Fixations
plt.figure(figsize=(12, 6))
sns.scatterplot(
    data=df_with_fixations,
    x="Avg H",
    y="Avg V",
    hue="Fixation",
    palette="tab10",
    legend="full",
    s=50,
)
plt.title("Averaged Eye Coordinates with Fixations")
plt.xlabel("Horizontal Coordinate (Avg H)")
plt.ylabel("Vertical Coordinate (Avg V)")
plt.legend(title="Fixation")
plt.grid(True)
plt.show()

# Visualization of Saccades
plt.figure(figsize=(12, 6))
for _, row in saccades_avg_df.iterrows():
    plt.plot(
        [row["StartX"], row["EndX"]], [row["StartY"], row["EndY"]], "r-o", markersize=4
    )
plt.scatter(
    df_with_fixations["Avg H"],
    df_with_fixations["Avg V"],
    c="blue",
    s=10,
    label="Averaged Eye Positions",
)
plt.title("Saccades (Averaged Eye)")
plt.xlabel("Horizontal Coordinate (Avg H)")
plt.ylabel("Vertical Coordinate (Avg V)")
plt.legend()
plt.grid(True)
plt.show()
