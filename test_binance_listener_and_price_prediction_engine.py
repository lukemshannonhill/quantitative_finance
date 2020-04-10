# ==================================================================================

#                                  Requirements Below

# ==================================================================================

import os
import json
import pandas as pd
import numpy as np
from sklearn import datasets
from sklearn.ensemble import RandomForestRegressor
from sklearn.datasets import make_regression
from sklearn.metrics import r2_score
from scipy.stats import spearmanr, pearsonr
from sklearn.tree import export_graphviz
import pydot
from flask import Flask, jsonify, request
from sklearn.metrics import mean_squared_error, r2_score
from sklearn.externals import joblib
from sklearn.pipeline import make_pipeline
from sklearn import preprocessing
from sklearn.model_selection import train_test_split, GridSearchCV
import pickle
from sklearn.pipeline import make_pipeline
import warnings
warnings.filterwarnings("ignore")
from binance.client import Client
from binance.websockets import BinanceSocketManager
from binance.enums import *

# ==================================================================================

#                                  Variable Declarations Below

# ==================================================================================

# the ordering to pass to call_model/ the order in which columns appear
# in the spreadsheets

#    p_of_t =
#    y_of_t =
#    x_of_t =
#    open = m['k']['o']
#    high = m['k']['h']
#    low = m['k']['l']
#    close = m['k']['c']
#    volume = m['k']['v']
#    quote_asset_volume = m['k']['q']
#    number_of_trades = m['k']['n']
#    taker_buy_base_asset_volume = m['k']['V']
#    taker_buy_quote_asset_volume = m['k']['Q']

###

# h_of_t tracks whether the application has traded or not
# if h_of_t is True (which is the case in the initial state of the application)
# then the application "has traded," meaning it possess an asset it is looing
# to sell. h_of_t == True == WANT to SELL
# h_of_t == Fale == WANT to BUY

TRANSACTION_FEE = 0.001
PATH_WHERE_THE_PICKLED_MODEL_LIVES = 'A String You Must Set'
GAMMA = 0.65


h_of_t = True

x_of_t_array = [0,0,0,0,0]
total_profit = 0
total_fees_paid = 0
transaction_price = 0
p_of_t = 0
y_of_t = 0
x_of_t = 0
tally_Count = 0
c_Sub_Ro = 0

first_time = True

new_data = {'p_of_t':0, 'y_of_t':0, 'x_of_t':0, 'open':0, 'high':0, 'low':0, 'close':0, 'volume':0, 'quote_asset_volume':0, 'number_of_trades':0, 'taker_buy_base_asset_volume':0, 'taker_buy_quote_asset_volume':0, 'tally_Count':0, 'c_Sub_Ro':0}

warm_up_buffer = 0

# ==================================================================================

#                                  Functions Below

# ==================================================================================

def call_model(data_to_pass):

    global first_time, warm_up_buffer, h_of_t, x_of_t_array, total_profit, total_fees_paid, transaction_price, p_of_t, y_of_t, x_of_t, tally_Count, c_Sub_Ro, new_data

    pickle_path = PATH_WHERE_THE_PICKLED_MODEL_LIVES

    print("Loading the model...")

    loaded_model = None

    with open(pickle_path,'rb') as f:
        loaded_model = pickle.load(f)

    print("The model has been loaded... prediction incoming...")

    feed_data = pd.DataFrame([data_to_pass], columns=data_to_pass.keys())

    prediction = loaded_model.predict(feed_data)

    float_prediction_result = prediction[0]

    print("The prediction is:")
    print(float_prediction_result)

    # now if prediction > confidence_threshold, check state against h_of_t and maybe do something

    if abs(float_prediction_result) > GAMMA:

        if float_prediction_result < 0 and h_of_t == True:

            if first_time == True:

                first_time = False
                transaction_price = float(new_data['close'])
                total_profit = total_profit - transaction_price


            # sell

            # need to create actual sell function here, but for now just assume it sells at the close price

            h_of_t = False

            transaction_price = float(new_data['close'])

            total_fees_paid = total_fees_paid + (transaction_price*TRANSACTION_FEE)

            fees_this_time = transaction_price*TRANSACTION_FEE

            total_profit = total_profit + transaction_price - fees_this_time

        if float_prediction_result > 0 and h_of_t == False:

            # buy

            # need to create actual buy function here, but for now just assume it buys at the close price

            h_of_t = True

            transaction_price = float(new_data['close'])

            total_fees_paid = total_fees_paid + (transaction_price*TRANSACTION_FEE)

            fees_this_time = transaction_price*TRANSACTION_FEE

            total_profit = total_profit - transaction_price - fees_this_time

    #return prediction

def process_message(m):

    #print(type(m))
    #print("message type: {}".format(m['e']))
    final_candle = m['k']['x']

    global warm_up_buffer, h_of_t, x_of_t_array, total_profit, total_fees_paid, transaction_price, p_of_t, y_of_t, x_of_t, tally_Count, c_Sub_Ro, new_data

    if final_candle == True and warm_up_buffer < 6:
        warm_up_buffer += 1

    if final_candle == True:

        # p(t) = (high + low) /2
        # ideally p(t) would equal min ask + max bid /2
        # y(t) = p(t) - p(t-1) ... i.e., first differences
        # x(t) = -1 IF y(t) < 0, 1 IF y(t) > 0, 0 IF y(t) = 0

        previous_y_of_t = y_of_t
        previous_p_of_t = p_of_t

        open = float(m['k']['o'])
        high = float(m['k']['h'])
        low = float(m['k']['l'])
        close = float(m['k']['c'])
        volume = float(m['k']['v'])
        quote_asset_volume = float(m['k']['q'])
        number_of_trades = float(m['k']['n'])
        taker_buy_base_asset_volume = float(m['k']['V'])
        taker_buy_quote_asset_volume = float(m['k']['Q'])

        p_of_t = (high + low)/2
        y_of_t = p_of_t - previous_p_of_t
        x_of_t = np.sign(y_of_t)
        x_of_t_array.pop(0)
        x_of_t_array.append(x_of_t)

        tally = 0
        for i in x_of_t_array:
            tally = tally + i

        if np.sign(y_of_t) == np.sign(previous_y_of_t):
            c_Sub_Ro = c_Sub_Ro + 1
        else:
            c_Sub_Ro = 1

        # tally_Count is the sum of x_of_t over the previous d=5 periods

        tally_Count = tally

        if warm_up_buffer > 5:

            # now overwrite the "new_data" dictionary values with the values just
            # obained from the final period's kline candle

            new_data['p_of_t'] = p_of_t
            new_data['y_of_t'] = y_of_t
            new_data['x_of_t'] = x_of_t
            new_data['open'] = open
            new_data['high'] = high
            new_data['low'] = low
            new_data['close'] = close
            new_data['volume'] = volume
            new_data['quote_asset_volume'] = quote_asset_volume
            new_data['number_of_trades'] = number_of_trades
            new_data['taker_buy_base_asset_volume'] = taker_buy_base_asset_volume
            new_data['taker_buy_quote_asset_volume'] = taker_buy_quote_asset_volume
            new_data['tally_Count'] = tally_Count
            new_data['c_Sub_Ro'] = c_Sub_Ro

            # now feed this new_data to call_model

            call_model(new_data)

            print("Total Profit:")
            print(total_profit)

            #print(m)

# ==================================================================================

#                              The Engine of the Thing

# ==================================================================================


client = Client("api-key", "api-secret", {"verify": False, "timeout": 20})

bm = BinanceSocketManager(client)

conn_key = bm.start_kline_socket('BTCUSDT', process_message, interval=KLINE_INTERVAL_5MINUTE)

# start the socket manager

bm.start()
