from selenium import webdriver
from selenium.webdriver.chrome.options import Options
import time
options = Options()
from selenium.webdriver.common.by import By 
import ace_tools_open as tools

# Tell Selenium to connect to the Chrome instance running with remote debugging
options.add_experimental_option("debuggerAddress", "127.0.0.1:9222")

driver = webdriver.Chrome(options=options)
driver.get("http://create.fortnite.com/a3b74a06-0c43-44da-b990-418620b5f388/projects/6231b253-49c1-ecc1-ca93-2e95953bb4e9/analytics")  # This uses your already logged-in session
print('loaded')
def run_scraper():
    time.sleep(5)
    gameplay_tab = driver.find_element(By.CSS_SELECTOR, "li[value='1']")
    gameplay_tab.click()
    time.sleep(1)
    date_picker_button = driver.find_element(By.CSS_SELECTOR, "button[data-testid='date-picker']")
    date_picker_button.click()
    time.sleep(1)
    yesterday_button = driver.find_element(By.CSS_SELECTOR, "li[value='yesterday']")
    yesterday_button.click()
    time.sleep(1)
    export_button = driver.find_element(By.XPATH, "//button[.//span[contains(text(), 'Export data')]]")
    export_button.click()
    time.sleep(1)
    checkbox_two = driver.find_element(By.CSS_SELECTOR, "input[name='game_xp'][type='checkbox']")
    checkbox_two.click()
    time.sleep(1)
    checkbox_two = driver.find_element(By.CSS_SELECTOR, "input[name='session_length'][type='checkbox']")
    checkbox_two.click()
    time.sleep(1)
    export_button = driver.find_element(By.XPATH, "//button[.//span[text()='Export']]")
    export_button.click()
    time.sleep(5)
    driver.quit()



def process_df(df):
    players_joined = df['Player_Joined'][0]
    print('number of players joined:', players_joined)
    #need to convert the string number into int
    players_joined = int(str(players_joined).replace(',', ''))
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

    # Define groups based on column names
    close_cols = [col for col in df.columns if 'Close' in col]
    medium_cols = [col for col in df.columns if 'Med' in col]
    far_cols = [col for col in df.columns if 'Far' in col]

    # Create accumulative columns
    df['Close Accumulative'] = df[close_cols].sum(axis=1)/players_joined
    df['Medium Accumulative'] = df[medium_cols].sum(axis=1)/players_joined
    df['Far Accumulative'] = df[far_cols].sum(axis=1)/players_joined
    df['Overall Accumulative'] = df.sum(axis=1)/players_joined

    df = df.reindex(sorted(df.columns), axis=1)
    df = df.sort_index()
    return df

import os
import zipfile
import pandas as pd

run_scraper()
# Define the downloads directory
downloads_dir = os.path.expanduser("~/Downloads")

zip_files = [f for f in os.listdir(downloads_dir) if f.endswith(".zip")]
latest_zip = max(zip_files, key=lambda f: os.path.getctime(os.path.join(downloads_dir, f)))

zip_path = os.path.join(downloads_dir, latest_zip)

with zipfile.ZipFile(zip_path, 'r') as zip_ref:
    zip_ref.extractall(downloads_dir)
    extracted_files = zip_ref.namelist()

csv_files = [f for f in extracted_files if f.endswith(".csv")]
if csv_files:
    latest_csv = os.path.join(downloads_dir, csv_files[0])
    
    # Read the CSV file into a DataFrame
    df = pd.read_csv(latest_csv)
    print(df)
    new_df = process_df(df)
    new_df.to_csv('processed.csv')
else:
    print("No CSV files found in the extracted contents.")