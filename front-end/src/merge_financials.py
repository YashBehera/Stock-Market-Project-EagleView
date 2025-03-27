import json
import os

# Define paths to the JSON files in src/components
financials_path = ("front-end\src\components/financials.json")
fundamentals_path = ("front-end\src\componentsfundamentals.json")
output_path = ("front-end\src\components/finalmerged.json")  # Output to a new file to preserve original

# Function to read JSON file
def read_json_file(file_path):
    try:
        with open(file_path, 'r') as file:
            return json.load(file)
    except FileNotFoundError:
        print(f"Error: File {file_path} not found.")
        return None
    except json.JSONDecodeError:
        print(f"Error: File {file_path} is not a valid JSON.")
        return None

# Function to write JSON file
def write_json_file(file_path, data):
    with open(file_path, 'w') as file:
        json.dump(data, file, indent=4)
    print(f"Merged data written to {file_path}")

# Main merge function
def merge_json_files(financials_data, fundamentals_data):
    if not financials_data or not fundamentals_data:
        print("Error: One or both input files are invalid or empty.")
        return None

    # Create a dictionary for quick lookup of fundamentals data by _id
    fundamentals_dict = {stock["_id"]: stock.get("shareholding_pattern", {}) for stock in fundamentals_data}

    # Iterate through financials data and merge shareholding_pattern
    merged_data = []
    for stock in financials_data:
        stock_id = stock["_id"]
        if stock_id in fundamentals_dict:
            # Add shareholding_pattern to the stock's data
            stock["shareholding_pattern"] = fundamentals_dict[stock_id]
        else:
            # If no matching stock in fundamentals, add an empty shareholding_pattern
            stock["shareholding_pattern"] = {}
            print(f"Warning: No shareholding_pattern data found for stock {stock_id}")
        merged_data.append(stock)

    return merged_data

# Execute the merge process
def main():
    # Read the JSON files
    financials_data = read_json_file(financials_path)
    fundamentals_data = read_json_file(fundamentals_path)

    # Merge the data
    merged_data = merge_json_files(financials_data, fundamentals_data)

    if merged_data:
        # Write the merged data to a new file
        write_json_file(output_path, merged_data)
    else:
        print("Merge process failed.")

if __name__ == "__main__":
    main()