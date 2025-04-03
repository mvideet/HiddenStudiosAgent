import pandas as pd

def filter_hgad_and_playerjoined(df):
    # Filter columns that contain 'HgAd' but exclude team-related columns
    filtered_cols = [col for col in df.columns if 'HgAd' in col and not any(x in col for x in ['GreenTeamJoined', 'PurpleTeamJoined'])]
    filtered_df = df[filtered_cols]
    return filtered_df

def transform_to_tuples(df):
    # Get all PlayerJoined columns (one for each version)
    player_joined_cols = [col for col in df.columns if 'PlayerJoined' in col]
    df = df.astype(object)
    
    for index, row in df.iterrows():
        # Process each column with its corresponding PlayerJoined count
        for col in df.columns:
            if 'PlayerJoined' not in col:
                # Get the version from the column name
                version = col.split('-')[-1]
                # Find matching PlayerJoined column for this version
                matching_pj_col = [pj_col for pj_col in player_joined_cols if version in pj_col][0]
                
                players_joined = row[matching_pj_col]
                clean_number = str(players_joined).replace(",", "")
                players_joined = int(clean_number)
                
                impressions = str(row[col])
                impressions = int(impressions.replace(',', ''))
                df.at[index, col] = (impressions, players_joined)
    
    return df

def separate_by_code(df):
    codes = set(col.split('-')[-1] for col in df.columns if 'HgAd' in col)
    code_dfs = {}
    for code in codes:
        code_cols = [col for col in df.columns if col.endswith(code) or 'Player_Joined' in col]
        code_df = df[code_cols].copy()
        code_dfs[code] = code_df
    return code_dfs

def update_tuples(df_dict):
    for code, df in df_dict.items():
        for index, row in df.iterrows():
            # Process each ad number separately
            for ad_num in range(1, 10):  # Assuming ads 1-9
                ad_prefix = f'HgAd{ad_num}-'
                # Get all columns for this specific ad
                ad_cols = [col for col in df.columns if col.startswith(ad_prefix)]
                
                if ad_cols:  # If we found columns for this ad
                    # Check if all impressions for this ad are 0
                    all_zero = all(
                        isinstance(row[col], tuple) and row[col][0] == 0
                        for col in ad_cols
                    )
                    
                    if all_zero:
                        # Set player count to 0 for all columns of this ad
                        for col in ad_cols:
                            df.at[index, col] = (0, 0)
    return df_dict

def compress_to_single_row(df_dict):
    compressed_dfs = {}
    for code, df in df_dict.items():
        # Initialize a dictionary to store the sum of tuples
        sum_dict = {col: (0, 0) for col in df.columns if col != 'Player_Joined'}
        
        for index, row in df.iterrows():
            for col in df.columns:
                if col != 'Player_Joined' and isinstance(row[col], tuple):
                    impressions, players_joined = row[col]
                    sum_impressions, sum_players = sum_dict[col]
                    sum_dict[col] = (sum_impressions + impressions, sum_players + players_joined)
        
        # Create a DataFrame from the summed dictionary
        compressed_df = pd.DataFrame([sum_dict])
        compressed_dfs[code] = compressed_df
    
    return compressed_dfs

def decompress_tuples(df_dict):
    decompressed_dfs = {}
    for code, df in df_dict.items():
        # Create new dictionary for decompressed data
        impressions_dict = {}
        players_dict = {}
        
        # Separate impressions and players into different dictionaries
        for col in df.columns:
            if isinstance(df.iloc[0][col], tuple):
                impressions, players = df.iloc[0][col]
                impressions_dict[col] = impressions
                players_dict["HgAd-PlayerJoined"] = players
        
        # Create new DataFrame with separated values
        decompressed_df = pd.DataFrame([impressions_dict])
        players_df = pd.DataFrame([players_dict])
        
        # Combine the DataFrames
        decompressed_df = pd.concat([decompressed_df, players_df], axis=1)
        decompressed_dfs[code] = decompressed_df
    
    return decompressed_dfs

def process_df(df):
    # print(df.columns)
    players_joined_col = 'HgAd-PlayerJoined'

    players_joined = int(df[players_joined_col][0])
    if players_joined == 0:
        print("Warning: Players Joined is zero, cannot calculate accumulative values.")
        return df  # Early return or handle as needed
    data_cols = [col for col in df.columns if col != players_joined_col]
    ad_to_column = {}
    ads = ['Ad1', 'Ad2', 'Ad3', 'Ad4', 'Ad5', 'Ad6', 'Ad7', 'Ad8']
    
    for col in data_cols:
        parts = col.split('-')
        ad = parts[0][2:5]
        tag = parts[1]
        
        if ad in ads:
            if ad not in ad_to_column:
                ad_to_column[ad] = {}
            ad_to_column[ad][tag] = df[col].iloc[0]
    
    processed_df = pd.DataFrame.from_dict(ad_to_column, orient='index')
    
    # Define the desired column order
    distance_order = ['Close05', 'Close1', 'Close2', 'Med05', 'Med1', 'Med2', 'Far05', 'Far1', 'Far2']
    
    # Get existing columns in each category
    existing_cols = []
    for dist in distance_order:
        if any(dist in col for col in processed_df.columns):
            cols = [col for col in processed_df.columns if dist in col]
            existing_cols.extend(sorted(cols))
    
    # Calculate accumulative columns
    close_cols = [col for col in processed_df.columns if 'Close' in col]
    medium_cols = [col for col in processed_df.columns if 'Med' in col]
    far_cols = [col for col in processed_df.columns if 'Far' in col]
    
    processed_df['Close Accumulative'] = processed_df[close_cols].sum(axis=1) / players_joined
    processed_df['Medium Accumulative'] = processed_df[medium_cols].sum(axis=1) / players_joined
    processed_df['Far Accumulative'] = processed_df[far_cols].sum(axis=1) / players_joined
    processed_df['Overall Accumulative'] = processed_df.sum(axis=1) / players_joined
    
    # Add accumulative columns to the order
    accumulative_cols = ['Close Accumulative', 'Medium Accumulative', 'Far Accumulative', 'Overall Accumulative']
    
    # Reorder columns
    final_col_order = existing_cols + accumulative_cols
    processed_df = processed_df[final_col_order]
    processed_df = processed_df.sort_index()
    
    return processed_df
def compress_algos(df):
    filtered_df = filter_hgad_and_playerjoined(df)
    transformed_df = transform_to_tuples(filtered_df)
    separated_dfs = separate_by_code(transformed_df)
    print(separated_dfs)
    updated_dfs = update_tuples(separated_dfs)
    compressed_dfs = compress_to_single_row(updated_dfs)
    decompressed_dfs = decompress_tuples(compressed_dfs)
    return decompressed_dfs
# Example usage
df = pd.read_csv('apr2.csv')
decompressed_dfs=compress_algos(df)
# print(decompressed_dfs)
print(decompressed_dfs['Hg3.1']['HgAd-PlayerJoined'][0])
for code, df in decompressed_dfs.items():
    new_df = process_df(df)
    new_df.to_csv(code+"_test.csv")
    print(f"Decompressed DataFrame for {code}:")
    print(new_df) 