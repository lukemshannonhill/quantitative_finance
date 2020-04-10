# The MIT Paper upon which this is based: https://devavrat.mit.edu/wp-content/uploads/2017/10/Trading-Bitcoins-and-Online-Time-Series-Prediction.pdf

import os
import pandas as pd
import numpy as np
from sklearn.externals import joblib
from flask import Flask, jsonify, request
import pickle
import requests
from collections import OrderedDict
import json


get = requests.get('http://IP:PORT/getdata') # GET request
data = get.json()

newdata = pd.DataFrame([data], columns=data.keys())

clf = 'path to where the pickled model lives.pkl'


print("Loading the model...")

loaded_model = None

with open(clf,'rb') as f:
    loaded_model = pickle.load(f)

print("The model has been loaded... predictions incoming...")

predictions = loaded_model.predict(newdata)

tpredictions = np.array(predictions).tolist()

# now immediately sending a post request with new data

post = requests.post('http://IP:PORT/postdata', json=tpredictions) # the POST request
