import subprocess
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
import time
options = Options()
from selenium.webdriver.common.by import By 
import ace_tools_open as tools
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from datetime import datetime, timedelta
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import pandas as pd
import os
from game_id_processing import compress_algos, process_df
import zipfile
command = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '--remote-debugging-port=9222',
    '--user-data-dir=/Users/mvideet/Library/Application Support/Google/Chrome_Remote',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--headless=new',
]
subprocess.Popen(command)

options = Options()
options.add_experimental_option("debuggerAddress", "127.0.0.1:9222")

# Initialize the driver with options
driver = webdriver.Chrome(options=options)
driver.get("https://create.fortnite.com/68097e35-61c5-4376-8bfa-15a6cf8b5e07/projects/6231b253-49c1-ecc1-ca93-2e95953bb4e9/analytics")
print('loaded')
driver.save_screenshot("error.png")

def run_scraper():
    time.sleep(5)
    gameplay_tab = driver.find_element(By.CSS_SELECTOR, "li[value='1']")
    gameplay_tab.click()
    driver.save_screenshot("error.png")
    time.sleep(5)
    date_picker_button = driver.find_element(By.CSS_SELECTOR, "button[data-testid='date-picker']")
    date_picker_button.click()
    driver.save_screenshot("error.png")

    time.sleep(5)
    custom_date = driver.find_element(By.CSS_SELECTOR, "li[value='custom']")
    custom_date.click()
    driver.save_screenshot("error.png")

    calendar = WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.CLASS_NAME, "react-datepicker__current-month"))
    )
    print("Initial month:", calendar.text)
    while True:
        calendar = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CLASS_NAME, "react-datepicker__current-month"))
        )
        current_text = calendar.text
        print("Current month:", current_text)
        if "March 2025" in current_text:
            break
        prev_month_button = driver.find_element(By.CLASS_NAME, "react-datepicker__navigation--previous")
        prev_month_button.click()
        
        WebDriverWait(driver, 10).until(
            lambda d: d.find_element(By.CLASS_NAME, "react-datepicker__current-month").text != current_text
        )

    print("Target reached:", calendar.text)
    time.sleep(2)
    driver.save_screenshot("error.png")

    day_element = WebDriverWait(driver, 10).until(
    EC.element_to_be_clickable((By.XPATH, "//div[contains(@class, 'react-datepicker__day--027') and contains(@class, 'react-datepicker__day--in-range')]"))
)
    day_element.click()
    print("Clicked March 27th")

    target_month = datetime.now().strftime("%B %Y")
    print("Target month:", target_month)
    forward_facing_calendar = WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.CLASS_NAME, "react-datepicker__current-month"))
    )
    while target_month not in forward_facing_calendar.text:
        forw_month_button = driver.find_element(By.CLASS_NAME, "react-datepicker__navigation--next")
        forw_month_button.click()
        forward_facing_calendar = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CLASS_NAME, "react-datepicker__current-month"))
        )
    print("Target month reached:", forward_facing_calendar.text)
    today = datetime.today()
    day_before = today - timedelta(days=2)
    driver.save_screenshot("error.png")
    day_str = str(day_before.day).zfill(3)
    print(day_str)
    day_xpath = f"//div[contains(@class, 'react-datepicker__day--{day_str}')]"
    print("Using XPath:", day_xpath)
    try:
        day_element = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, day_xpath))
        )
        day_element.click()
    except Exception as e:
        print("Error finding or clicking the day element:", e)
    apply_button = WebDriverWait(driver, 10).until(
        EC.element_to_be_clickable((By.XPATH, "//button[.//span[text()='Apply']]"))
    )
    apply_button.click()
    time.sleep(3)
    export_button = driver.find_element(By.XPATH, "//button[.//span[contains(text(), 'Export data')]]")
    export_button.click()
    time.sleep(3)
    driver.save_screenshot("error.png")
    wait = WebDriverWait(driver, 10)
    checkbox = driver.find_element(By.CSS_SELECTOR, "input[name='session_length']")
    checkbox.click()
    time.sleep(1)
    wait = WebDriverWait(driver, 10)
    element_to_view = driver.find_element(By.NAME, "session_length")
    driver.execute_script("arguments[0].scrollIntoView(true);", element_to_view)

    driver.save_screenshot("error.png")

    checkbox = driver.find_element(By.CSS_SELECTOR, "input[name='game_xp']")
    checkbox.click()
    time.sleep(3)
    driver.save_screenshot("error.png")
    export_button = driver.find_element(By.XPATH, "//button[.//span[text()='Export']]")
    export_button.click()
    driver.save_screenshot("error.png")
    print('exported data')
    time.sleep(3)
    driver.quit()

        
run_scraper()
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
    df = pd.read_csv(latest_csv)
    decompressed_dfs=compress_algos(df)
    print(decompressed_dfs['Hg3.1']['HgAd-PlayerJoined'][0])
    for code, df in decompressed_dfs.items():
        new_df = process_df(df)
        #new_df.to_csv(code+"_test.csv")
        print(f"Decompressed DataFrame for {code}:")
        print(new_df) 
else:
    print("No CSV files found in the extracted contents.")





