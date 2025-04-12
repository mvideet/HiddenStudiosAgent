
import pandas as pd
import numpy as np
import pickle
import numpy as np
from statsmodels.tsa.ar_model import AutoReg
def forecast_ar_slot(slot_series, lags=1, forecast_steps=3):
    model = AutoReg(slot_series, lags=lags, old_names=False).fit()
    forecast = model.predict(start=len(slot_series), end=len(slot_series) + forecast_steps - 1)
    return [int(element) for element in forecast]

def forecast_impressions(impressions_data, forecast_steps=3):
    num_days, num_slots = impressions_data.shape
    # Validate input shape (it must be 8 days) for now
    if num_days != 8:
        raise ValueError("Input data must have exactly 8 days (rows) of impressions.")
    
    forecasts = []
    for slot in range(num_slots):
        slot_series = impressions_data[:, slot]
        slot_forecast = forecast_ar_slot(slot_series, lags=1, forecast_steps=30)
        forecasts.append(slot_forecast)
    
    forecast_matrix = np.column_stack(forecasts)
    return forecast_matrix

def forecaster():
    # For now, this is based on the static 8 days of data we have. Eventually, this will be real-time and generated each day to change control predictions in real-time
    all_data=[]
    for i in range(1, 9):
        all_data.append(pd.read_csv("/Users/shauryaagrawal/Documents/GitHub/HiddenStudiosAgent/latest_data/Hg3."+str(i)+"_test.csv"))
    #all_data.append(pd.read_csv("/Users/shauryaagrawal/Downloads/analytics_device.csv"))

    for i in range(len(all_data)):
        all_data[i]['overall_impressions']=all_data[i][["Close05","Close1", "Close2", "Med05", "Med1", "Med2", "Far05", "Far1", "Far2"]].sum(axis=1)
    impressions_data=[]
    for i in all_data:
        impressions_data.append(list(i['overall_impressions']))

    forecast_steps = 3
    forecast_matrix = forecast_impressions(np.array(impressions_data), forecast_steps=forecast_steps)
    
    print("Historical impressions (each row = a day, each column = a game slot):")
    print(impressions_data)
    
    print(f"\nForecasted impressions for the next {forecast_steps} days (rows: days, columns: game slots):")
    print(forecast_matrix)
    return forecast_matrix
#LSTM does not work
"""import torch
import torch.nn as nn
import torch.optim as optim
class ARForecastModel(nn.Module):
    def __init__(self, input_size, hidden_size, num_layers=1):
        super(ARForecastModel, self).__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)
        # Fully connected layer to project the last LSTM output back to impression space
        self.fc = nn.Linear(hidden_size, input_size)
    
    def forward(self, x):
        out, (h, c) = self.lstm(x)
        # Use the output from the last time step for prediction
        pred = self.fc(out[:, -1, :])
        return pred

Training function for one-step prediction
def train_model(model, series, input_window=7, num_epochs=100, learning_rate=1e-3):
    optimizer = optim.Adam(model.parameters(), lr=learning_rate)
    criterion = nn.MSELoss()
    #   Input: days[0:7], Target: day[7]
    inputs = []
    targets = []
    T = series.shape[0]
    for i in range(T - input_window):
        inputs.append(series[i:i+input_window])
        targets.append(series[i+input_window])
    inputs = torch.stack(inputs)   # Shape: (num_samples, input_window, input_size)
    targets = torch.stack(targets)   # Shape: (num_samples, input_size)
    
    for epoch in range(num_epochs):
        model.train()
        optimizer.zero_grad()
        output = model(inputs)
        loss = criterion(output, targets)
        loss.backward()
        optimizer.step()
        
        if (epoch + 1) % 10 == 0:
            print(f"Epoch [{epoch+1}/{num_epochs}], Loss: {loss.item():.4f}")
    
    return model
def predict_future(model, series, input_window=7, future_steps=3):
    model.eval()
    # Start with the last `input_window` days from the given series
    input_seq = series[-input_window:].unsqueeze(0)  # Shape: (1, input_window, input_size)
    predictions = []
    
    for _ in range(future_steps):
        with torch.no_grad():
            pred = model(input_seq)  # Shape: (1, input_size)
        predictions.append(pred.squeeze(0))
        # Slide the window: drop the oldest day and append the new prediction
        input_seq = torch.cat([input_seq[:, 1:, :], pred.unsqueeze(1)], dim=1)
    
    return torch.stack(predictions)  # Shape: (future_steps, input_size)

if __name__ == "__main__":
    # Example: forecasting impressions for 5 game slots.
    # Assume an 8-day series where each day is represented by a 5-dimensional vector.
    torch.manual_seed(42)
    num_days = 8
    num_slots = 8  # Number of features (impressions for different slots)
    series = torch.randn(num_days, num_slots)
    hidden_size = 16
    input_window = 7  # Use 7 days as input to predict the 8th day
    model = ARForecastModel(input_size=num_slots, hidden_size=hidden_size)
    
    model = train_model(model, torch.Tensor(impressions_data), input_window=input_window, num_epochs=100, learning_rate=1e-3)
    future_steps = 3
    future_predictions = predict_future(model, torch.Tensor(impressions_data), input_window=input_window, future_steps=future_steps)
    
    print("\nOriginal 8-day series (each row is a day, columns are slots):")
    print(impressions_data)
    print(f"\nPredicted impressions for the next {future_steps} days:")
    print(future_predictions)"""



