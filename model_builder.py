# The MIT Paper upon which this is based: https://devavrat.mit.edu/wp-content/uploads/2017/10/Trading-Bitcoins-and-Online-Time-Series-Prediction.pdf

# ==================================================================================

#                                  Dependencies Below

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
from sklearn.metrics import mean_squared_error, r2_score
from sklearn.externals import joblib
from sklearn.pipeline import make_pipeline
from sklearn import preprocessing
from sklearn.model_selection import train_test_split, GridSearchCV
import pickle
from sklearn.pipeline import make_pipeline
import warnings
warnings.filterwarnings("ignore")

# ==================================================================================

#                                  Variables Below

# ==================================================================================

# Below I've implemented the logic discussed in Trading Bitcoin and Online Time Series Prediction.

# Here is the URL to that paper: https://devavrat.mit.edu/wp-content/uploads/2017/10/Trading-Bitcoins-and-Online-Time-Series-Prediction.pdf

# Please be sure to read through the paper carefully in order to understand the nameing conventions I use below.

# The CSV dataset you load should have the following column labels as the first row
# (for clarity, each column label has been surrounded by square brackets (i.e., these: [])--please omit these square brackets when labeling your own columns):

# [p_of_t]  [y_of_t]    [x_of_t]    [future_x_of_t] [open]	[high]	[low]	[close]	[volume]	[quote asset volume]	[number of trades]	[taker buy base asset volume]	[taker buy quote asset volume]

#Following the conventions used in the paper:

# p(t) = (high + low) /2
# ideally p(t) would equal min ask + max bid /2
# y(t) = p(t) - p(t-1) ... i.e., first differences
# x(t) = -1 IF y(t) < 0, 1 IF y(t) > 0, 0 IF y(t) = 0

PATH = 'A value you must set: this is directory PATH to where your project lives'

PATH_TO_PICKLED_MODEL = 'A value you must set: this is where the pickled model will live'

PATH_TO_DATASET = 'A value you must set: this is where the dataset lives'

# the authors discuss this value toward the end of their paper--d=5 performs better than the other choices they discussed

d = 5

# ==================================================================================

#                           Building the Model Below

# ==================================================================================


dataset = pd.read_csv(PATH_TO_DATASET)

x_of_t = dataset.x_of_t

#the below loop builds RI (short for "Row Index") to a length equal to the number of observational rows n the dataset

l = len(x_of_t.index) -1
RI = []
i = 0
while i <= l:
    RI = RI + [i]
    i += 1

#tally_Count is built in pandas/memory using "x_of_t"

tally_Count = pd.DataFrame({'tally_Count': RI})

tally_at_t = 0

i = 0
while i <= l:

    # this is the "general" case that will almost always be operative: when i is greater than the window length, d,
    # then calcualte the tally_Count by looking back across the window and summing

    if i > d:
        tally_at_t = x_of_t[i-1] + x_of_t[i-2] + x_of_t[i-3]+x_of_t[i-4]+x_of_t[i-5]
        tally_Count.loc[i,'tally_Count'] = tally_at_t
        i += 1

        # this is the beginning, special case: in the first five rows we haven't established a long enough
        # window (i.e., window length =< d): in this case, simply build the window
        # seems like there's an error here, though, as there's no summing occuring.

    else:
        tally_Count.loc[i,'tally_Count'] = x_of_t[i]
        i += 1

# def. c_Sub_Ro [t-1] = max_sub_k(K:ro=x[t-1] = x[t-2] = ... = x[t-k])
# c_Sub_Ro measures the "run length" of the most recent price trend. As soon as that trend is broken, c_Sub_Ro will reset to 1 (by def)

c_Sub_Ro = pd.DataFrame({'c_Sub_Ro': RI})

max_K = 1 #by def. c_Sub_Ro [t-1] = max_sub_k(K:ro=x[t-1] = x[t-2] = ... = x[t-k) always at least a run lenght of one

i = 0
run_Length = 1

while i <= l:

    if i == 0:

        c_Sub_Ro.loc[i, 'c_Sub_Ro'] = max_K

    else:

        foo = x_of_t[i]
        foo_Previous = x_of_t[i-1]

        if foo == foo_Previous:

            run_Length += 1

            c_Sub_Ro.loc[i,'c_Sub_Ro'] = run_Length

        else:

            run_Length = 1
            c_Sub_Ro.loc[i, 'c_Sub_Ro'] = run_Length

    i += 1

dataset = pd.concat([dataset, tally_Count, c_Sub_Ro], axis=1)

dataset.drop(dataset.index[len(dataset)-1])
dataset.drop(dataset.head(3).index, inplace=True)

y = dataset.future_x_of_t
X = dataset.drop('future_x_of_t', axis=1)
X_train, X_test, y_train, y_test = train_test_split(X, y,test_size=0.2, random_state=42)

rf_model = RandomForestRegressor(n_estimators=999, random_state=42, n_jobs = -1)
rf_model.fit(X_train, y_train)

features = dataset.columns

importances = rf_model.feature_importances_
std = np.std([tree.feature_importances_ for tree in rf_model.estimators_],
             axis=0)
indices = np.argsort(importances)

rf_model_filename = PATH_TO_PICKLED_MODEL

rf_model_pkl = open(rf_model_filename, 'wb')
pickle.dump(rf_model, rf_model_pkl)
rf_model_pkl.close()

rf_model_pkl = open(rf_model_filename, 'rb')
saved_rf_model = pickle.load(rf_model_pkl)

pred = saved_rf_model.predict(X_test)

print("X_test:")
print(X_test)
print("The type of X_test is:")
print(type(X_test))
print("R^2 score is (between y_test and pred):")
print (r2_score(y_test, pred))
print("The MSE is (between y_test and pred:")
print (mean_squared_error(y_test, pred))
