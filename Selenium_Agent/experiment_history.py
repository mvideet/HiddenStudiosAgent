import pandas as pd
import os

version = 8

# Create latest_data directory if it doesn't exist
os.makedirs('latest_data', exist_ok=True)
df_list = []
for i in range(version):
    df_list.append(pd.read_csv(f"latest_data/Hg3.{i+1}_test.csv"))
print(len(df_list))
char_to_tag = {'A': [1,1,1], 'B':[1,2,2], 'C':[1,1,3],'D': [2,2,1],'E':[2,2,2],'F':[2,1,2],'G':[3,2,3],'H':[3,1,2],'I':[3,1,3],'J':[2,1,1], 'K':[1,1,2]}
day_to_sequence = {1:'ABCDEFGH', 2: 'BCDEFGHI', 3: 'CDEFGHIA', 4: 'DEFGHIJK', 5: 'EFGHIJKA', 6: 'FGHIJKAB', 7: 'GHIJKABC', 8: 'HIJKABCD'}
embedding_impressions = {}
for day in day_to_sequence:

    #for every day, each ad A -> K were in a different ad space. we have the embeddings for each ad along with the ad spot that it was in
    data = df_list[day-1]
    print("day", day)

    #Ad1 corresponds to day_to_sequence[day][0]
    #Ad2 corresponds to day_to_sequence[day][1]
    #Ad3 corresponds to day_to_sequence[day][2]
    #Ad4 corresponds to day_to_sequence[day][3]
    #Ad5 corresponds to day_to_sequence[day][4]
    #Ad6 corresponds to day_to_sequence[day][5]
    #Ad7 corresponds to day_to_sequence[day][6]
    #Ad8 corresponds to day_to_sequence[day][7]
    
    get_all_ads = []
    for i in range(9):
        get_all_ads.append(data[data['Unnamed: 0'] == 'Ad' +str(i)])
    
    #now that we have all the ads for a given day, create the embeddings for each ad
    for i in range(len(day_to_sequence[day])):
        # Create a copy of the original embedding to avoid modifying the original
        embedding = char_to_tag[day_to_sequence[day][i]].copy()
        # Add the position to the copy
        embedding.append(i+1)
        print(embedding)
        embedding_impressions[tuple(embedding)] = get_all_ads[i+1]

#what is the best way to save this?
import pickle
with open('embedding_impressions.pkl', 'wb') as f:
    pickle.dump(embedding_impressions, f)

