import pandas as pd

def process_df(df):
    players_joined_col = [col for col in df.columns if 'HgAd-PlayerJoined' in col][0]
    print(players_joined_col)
    players_joined = df[players_joined_col].iloc[0]
    players_joined = int(str(players_joined).replace(',', ''))

    #need to convert the string number into int
    ad_to_column = {}
    ads = ['Ad1', 'Ad2', 'Ad3', 'Ad4', 'Ad5', 'Ad6', 'Ad7', 'Ad8', 'Ad9']
    for c in df.columns:
        ad = c[2:5]
        if ad in ads and ad in ad_to_column:
            tag = c[6:]
            ad_to_column[ad].append((tag, df[c][0]))
        elif ad in ads and not ad in ad_to_column:
            tag = c[6:]
            ad_to_column[ad] = [(tag, df[c][0])]
    df = pd.DataFrame.from_dict({k: dict(v) for k, v in ad_to_column.items()}, orient='index')
    df = df.applymap(lambda x: pd.to_numeric(str(x).replace(',', ''), errors='coerce'))
    print('columns:', df.columns)

    # Define groups based on column names
    close_cols = [col for col in df.columns if 'Close' in col]
    medium_cols = [col for col in df.columns if 'Med' in col]
    far_cols = [col for col in df.columns if 'Far' in col]
    print(players_joined)
    # Create accumulative columns
    df['Close Accumulative'] = df[close_cols].sum(axis=1)/players_joined
    df['Medium Accumulative'] = df[medium_cols].sum(axis=1)/players_joined
    df['Far Accumulative'] = df[far_cols].sum(axis=1)/players_joined
    df['Overall Accumulative'] = df.sum(axis=1)/players_joined

    df = df.reindex(sorted(df.columns), axis=1)
    df = df.sort_index()
    return df

df = pd.read_csv('analytics_device319.csv')
df = process_df(df)
df.to_csv('analytics_processed_319.csv')

