import numpy as np
import pandas as pd
from control_predictor import forecaster
from itertools import combinations

def min_days_close_to_target(impressions, target):
    n = len(impressions)
    for r in range(1, n + 1):
        valid_combinations = []
        for combo in combinations(range(n), r):
            combo_sum = sum(impressions[i] for i in combo)
            if combo_sum >= target:
                valid_combinations.append((combo, combo_sum))
        if valid_combinations:
            best_combo, best_sum = min(valid_combinations, key=lambda x: x[1])
            return r, sorted(best_combo), best_sum
    return None, None, None

if __name__ == "__main__":
    impressions = pd.DataFrame(forecaster())
    start_date=0
    end_date=20 
    ad_type=0
    modified_impressions=np.array(impressions.iloc[start_date+1:end_date, ad_type])
    original_target = 2500000
    modified_target = original_target - (impressions.iloc[start_date][0]+impressions.iloc[end_date][0])
    print(modified_target)
    num_days, days_indices, total = min_days_close_to_target(modified_impressions, modified_target)
    if modified_target<0:
        num_days=0
        days_indices=[]
        total=0
    print("Forecasted impressions for the slot over days:")
    print(impressions)
    if num_days is not None:
        print(f"\nMinimum number of days needed: {num_days+2}")
        all_indices=days_indices+[start_date, end_date]
        all_indices.sort()
        print(f"Days selected (0-indexed): {all_indices}")
        print(f"Total impressions from selected days: {total+impressions.iloc[start_date][0]+impressions.iloc[end_date][0]:.2f}")
    else:
        print(f"\nIt is not possible to reach {original_target} impressions with the given forecast days.")