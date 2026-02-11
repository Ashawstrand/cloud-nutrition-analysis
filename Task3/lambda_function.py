import io
import json
from datetime import datetime
 
import pandas as pd
from azure.storage.blob import BlobServiceClient
 
# Azurite local emulator connection string
CONNECTION_STRING = "UseDevelopmentStorage=true"

CONTAINER_NAME = "datasets"
BLOB_NAME = "All_Diets.csv"
OUTPUT_PATH = "simulated_nosql/results.json"


def process_nutritional_data_from_azurite() -> str:
    # Connect to Azurite
    blob_service_client = BlobServiceClient.from_connection_string(CONNECTION_STRING)
    container_client = blob_service_client.get_container_client(CONTAINER_NAME)
    blob_client = container_client.get_blob_client(BLOB_NAME)

    # Download CSV bytes from Blob
    csv_bytes = blob_client.download_blob().readall()
    df = pd.read_csv(io.BytesIO(csv_bytes))

    # Ensure numeric columns
    for col in ["Protein(g)", "Carbs(g)", "Fat(g)"]:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    # Fill missing numeric values with column mean
    df[["Protein(g)", "Carbs(g)", "Fat(g)"]] = df[
        ["Protein(g)", "Carbs(g)", "Fat(g)"]
    ].fillna(df[["Protein(g)", "Carbs(g)", "Fat(g)"]].mean(numeric_only=True))

    # Calculate averages per diet type
    avg_macros = (
        df.groupby("Diet_type")[["Protein(g)", "Carbs(g)", "Fat(g)"]]
        .mean()
        .round(2)
        .reset_index()
    )

    # Build result JSON (simulated NoSQL document)
    result_doc = {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "source": {"container": CONTAINER_NAME, "blob": BLOB_NAME},
        "avg_macros_by_diet_type": avg_macros.to_dict(orient="records"),
    }

    # Write to simulated NoSQL storage
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(result_doc, f, indent=2)

    return f"Processed data from Azurite and saved to {OUTPUT_PATH}"


if __name__ == "__main__":
    print(process_nutritional_data_from_azurite())
