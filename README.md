Hi there!

And welcome to an exploration of quantitative finance via the lens of the following paper out of MIT:

https://devavrat.mit.edu/wp-content/uploads/2017/10/Trading-Bitcoins-and-Online-Time-Series-Prediction.pdf

The basic idea is: given some historical information about the price movement of an asset (say, Bitcoin), could we construct a mechanism that reliably predicts the future price movement of the asset so considered?

This is, essentially, the question the authors of the above paper seek to answer.

Turns out: yeah, you can!

This idea piqued my interest (in particular, the claims made in the paper's abstract--I mean, wow!) and so I sought to understand and, subsequently, implement, the paper.

Before proceeding further, however, please understand two crucial working assumptions adopted within the analytical framework of the paper:

1) Instantaneous Transactions (which is a satisfiable assumption some to most of the time, depending upon market conditions/liquidity/your lot size)
2) No Transaction Costs/Fees (which is #NOT a satisfiable assumption most of the time)

This repo contains "the logic of the thing," if you will. Provided the appropriate data and redelcaration of relevant path variables throughout, it should run and merrily predict away. Incumbent upon you, should you wish to do so, is to source the relevant datasets with which to train the predictive model.

Of note is that there are actually two test implementations here and both use model_builder.py as, well, the model builder.

The first implementation was a lot of fun to write and think through--it's contained in test_coinbase_pro_listener_and_price_prediction_engine.js. It's an exploration of using node.js to maintain a websocket connection, manage a database, and manage would-be active orders and order books per application specific logic. It also shuttles the data is receives and parses to (test_python_gdax_server.py, which calls) the predictive and pickled python model and then awaits word on what the future may hold (and then acts accordingly).

The second implementation, located in python_binance, is simpler and trades the node.js implementation for a python-centric view of things.

A final note on the node.js piece: in an attempt to mirror the authors' intent (which was to predict the movement of Bitcoin every 5 seconds), it maintains 12 one minute windows, each staggered five seconds from the previous window. It's not really the same thing as this model, as implemented, ends up making 12 one minute predictions each minute rather than a prediction for price movement over the course of the subsequent five second period (so, concretely, at 12:01:05 a prediction for whether the price will rise or fall by 12:02:05 is rendered).

I couldn't find a way to more closely mirror the author's intent without access to cached historical market data at a finer temporal resolution (the five second (or lower) timescale), which, unfortunately, I simply didn't have.

Please let me know if you have questions, spot errors, or would like to collaborate on some interesting extension of this or related work.

Thanks!
