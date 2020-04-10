// The MIT Paper upon which this is based: https://devavrat.mit.edu/wp-content/uploads/2017/10/Trading-Bitcoins-and-Online-Time-Series-Prediction.pdf

// ==================================================================================

//                                  Requirements Below

// ==================================================================================

const Num = require('num');
const Gdax = require('gdax');

const nano = require('nano')('http://admin:PASSWORD@IP:PORT');
const test_trades = nano.db.use('test_trades');
const callbacks = nano.db.use('callbacks')
const fs = require('fs');
const PythonShell = require('python-shell');
const express = require('express');
const bodyParser = require('body-parser');
const request = require('request-promise');
const uuidv4 = require('uuid/v4');

const orderbook = new Gdax.Orderbook();
const orderbookSync = new Gdax.OrderbookSync(['BTC-USD']);

const apiURI = 'https://api.pro.coinbase.com';

const key = 'key';
const secret = 'secret';
const passphrase = 'passphrase';

const authedClient = new Gdax.AuthenticatedClient(
  key,
  secret,
  passphrase,
  apiURI
);

//const websocket = new Gdax.WebsocketClient(['BTC-USD']);

const websocket = new Gdax.WebsocketClient(
  ['BTC-USD'],
  'wss://ws-feed.pro.coinbase.com',
  {
    key: key,
    secret: secret,
    passphrase: passphrase,
  },
  { channels: ['full', 'level2', 'heartbeat'] }
);

// ==================================================================================

//                                  Functions Below

// ==================================================================================

const callback = (error, response, data) => {

  if (error)
 	return console.dir(error);

  console.dir(data);

  if (data.settled === false || data.status === "pending" || data.status === "open" || data.status === "active" || data.product_id === "BTC-USD") {
    // insert the newly created order in the order_map with it's id as a key and its size as a value
    var key_string = data.id;
    order_map.set(key_string, data.size);
    }

    if (data.status === "rejected") {
      let v = Number(data.size);
      tradable_amount = tradable_amount + v;
      tradable_amount = tradable_amount * 100000000;
      tradable_amount = Math.floor(tradable_amount);
      tradable_amount = (tradable_amount / 100000000);
      order_map.delete(data.id);
      has_traded = false;
    }
}

function getFormattedDate() {

    var date = new Date();
    var month = date.getMonth() + 1;
    var day = date.getDate();
    var hour = date.getHours();
    var min = date.getMinutes();
    var sec = date.getSeconds();

    month = (month < 10 ? "0" : "") + month;
    day = (day < 10 ? "0" : "") + day;
    hour = (hour < 10 ? "0" : "") + hour;
    min = (min < 10 ? "0" : "") + min;
    sec = (sec < 10 ? "0" : "") + sec;
    var str = date.getFullYear() + "-" + month + "-" + day + "_" +  hour + ":" + min + ":" + sec;
    return str;
}

function saveState() {
    fs.writeFile('path leading to where the internal, jsonified state of this application lives.json', JSON.stringify(internal_State), (err) => {
      if (err) throw err;
    //  console.log("The internal_State has been saved!");
    });
  }

function getSum(total, num) {
    return total + num;
  }

function build_TO_BUY_book(symbol, count) {

    var book = orderbookSync.books[symbol];

    pack_mule = 0;
    to_buy_array = [];
    book._asks.each((item) => {

        let quantity = 0;
        item.orders.forEach((order) => quantity = quantity + Number(order.size.toString()));
        price = Number(item.price.toString());
        to_buy_array.push([price, quantity]);
        pack_mule = pack_mule + quantity;

        if (pack_mule >= count)
            return false;
  });
}

function build_TO_SELL_book(symbol, count) {

  var book = orderbookSync.books[symbol];

  pack_mule = 0;
  to_sell_array = [];

  book._bids.reach((item) => {

    let quantity = 0;
    item.orders.forEach((order) => quantity = quantity + Number(order.size.toString()));
    price = Number(item.price.toString());
    to_sell_array.push([price, quantity]);
    pack_mule = pack_mule + quantity;

    if (pack_mule >= count)
      return false;
  });
}

// ==================================================================================

//                                  Variable Declarations Below

// ==================================================================================

var order_map = new Map();
cancelled_or_filled_flag = false;
var volume_array = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
var delta_p_array = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
var c_Sub_Ro_array = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
var price_start_array = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
var p_avg_this_period_array = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
var app = express();
var internal_State = {};
var warm_up_buffer = 0;
var l = 0;
var y = 0;
var to_sell_array = [];
var to_buy_array = [];
var array = [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]];
var delta_p = 0;
var price_float = 0;
var price_start = 0;
var i = 0;
var volume = 0;
var c_Sub_Ro = 0;
var tally_Count = 0;
var delta_p_previous_period = 0;
var gamma = 0;
var h_of_t = true;
var confidence_threshold = 0.51;
var total_profit = 0;
var latest_trade = 0;
var p_avg_this_period = 0;
var p_avg_previous_period = 0;
var last_buy = 0;
var last_sell = 0;
var sell_profit = 0;
var sell_profit_fix = 0;
var x_Of_T = 0;
var session_trade_increment = 0;
var transaction_price = 0;
var max_bid = 0;
var min_ask = 0;
var built_buy_book = [];
var built_sell_book = [];
var has_traded = false;
var tradable_amount = 0.05
var flip_flop_flag = false;

var d_of_t = 0; // buy, if h_of_t = 0 && gamma > confidence_threshold
                // sell if h_of_t = 1 && gamma < -(confidence_threshold)
                // else do nothing

  var internal_State = {
      has_traded: has_traded,
      volume_array: volume_array,
      delta_p_array: delta_p_array,
      c_Sub_Ro_array: c_Sub_Ro_array,
      price_start_array: price_start_array,
      p_avg_this_period_array: p_avg_this_period_array,
      warm_up_buffer: warm_up_buffer,
      l: l,
      array: array,
      delta_p: delta_p,
      price_float: price_float,
      price_start:price_start,
      i: i,
      volume: volume,
      c_Sub_Ro: c_Sub_Ro,
      tally_Count: tally_Count,
      delta_p_previous_period: delta_p_previous_period,
      gamma: gamma,
      h_of_t: h_of_t,
      tradable_amount: tradable_amount,
      confidence_threshold: confidence_threshold,
      total_profit: total_profit,
      latest_trade: latest_trade,
      p_avg_this_period: p_avg_this_period,
      p_avg_previous_period: p_avg_previous_period,
      last_buy: last_buy,
      last_sell: last_sell,
      sell_profit: sell_profit,
      sell_profit_fix: sell_profit_fix,
      x_Of_T: x_Of_T,
      session_trade_increment: session_trade_increment,
      transaction_price: transaction_price,
      max_bid: max_bid,
      min_ask: min_ask,
      d_of_t: d_of_t,
      y: y,
    }


// ==================================================================================

//                        Load Statefulness on Launch Below

// ==================================================================================

console.log("Sanity Check on Statefulness...")
console.log(delta_p)

// ==================================================================================

//                                  Main Loop Below

// ==================================================================================

setInterval(() => {

  build_TO_BUY_book('BTC-USD', 1);
  build_TO_SELL_book('BTC-USD', 1);

  console.log("TO BUY Book is...")
  console.log(to_buy_array)

  console.log("TO SELL Book is...")
  console.log(to_sell_array)

  volume_array.push(volume);
  volume_array.shift();

  price_start_array.push(price_start);
  price_start_array.shift();

  if (warm_up_buffer > 6) {

  max_bid = Number(orderbookSync.books['BTC-USD']._bids.max().price.toString());
  min_ask = Number(orderbookSync.books['BTC-USD']._asks.min().price.toString());

  }

  p_avg_previous_period = p_avg_this_period_array[0];
  p_avg_this_period = ((price_start_array[0] + price_float)/2);
  p_avg_this_period_array.push(p_avg_this_period);
  p_avg_this_period_array.shift();

  delta_p_previous_period = delta_p_array[0];
  delta_p = p_avg_this_period - p_avg_previous_period;
  delta_p_array.push(delta_p);
  delta_p_array.shift();

  x_Of_T = Math.sign(delta_p);

  c_Sub_Ro = c_Sub_Ro_array[0];
  if (Math.sign(delta_p) === Math.sign(delta_p_previous_period)) {
      c_Sub_Ro = c_Sub_Ro + 1;
  } else {
      c_Sub_Ro = 1;
  }

  c_Sub_Ro_array.push(c_Sub_Ro);
  c_Sub_Ro_array.shift();

  array[y].push(Math.sign(delta_p));
  array[y].shift();

  tally_Count = array[y].reduce(getSum)

  PythonShell.defaultOptions = {scriptPath: 'consult your directory structure and PythonShell Documentation',
  pythonPath: '/usr/bin/python3'};

  PythonShell.run('test_python_gdax_server.py', function (err) {
    if (err) throw err;
    console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
    console.log(y)
    console.log(gamma);
    console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");

  // Logic of the Buy:
  // Can only issue orders in increments of 0.01 BTC

  // Is the lowest price I can buy at sufficiently liquid to allow for one trasnaction?

  // If so, transact. Else, grab what I can, issue the order, decrement the remianing to be bought,
  // and iterate (thereby climbing up the array)

  // buy, if h_of_t = 0 && gamma > confidence_threshold

  if (warm_up_buffer > 59 && h_of_t === false && gamma > confidence_threshold && has_traded === false) {

    console.log("BUY at>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>")

  //  build_TO_BUY_book('BTC-USD', 1);

      max_bid = Number(orderbookSync.books['BTC-USD']._bids.max().price.toString());

//    var price = 0;
//    var quantity = 0;
//    var i = 0;
//    var j = 0;

//    for (i = 0; tradable_amount > 0; i++) {

  //    price = to_buy_array[i][0];
  //    quantity = to_buy_array[i][1];

  //    if (quantity >= tradable_amount) {

        tradable_amount = tradable_amount * 100000000;
        tradable_amount = Math.floor(tradable_amount);
        tradable_amount = (tradable_amount / 100000000);

        var buyParams = {
          price: max_bid,
          size: tradable_amount,
          product_id: 'BTC-USD',
          post_only: true,
          time_in_force: "GTT",
          cancel_after: "min",
        };

        authedClient.buy(buyParams, callback);
        console.log(buyParams)
        tradable_amount = 0;
        has_traded = true;

      session_trade_increment = session_trade_increment + 1;
      console.log(total_profit)
  }

  // Logic of the Sell:
  // Can only issue orders in increments of 0.01 BTC

  // Is the highest price I can sell at sufficiently liquid to allow for one trasnaction?

  // If so, transact. Else, grab what I can, issue the order, decrement the remianing to be sold,
  // and iterate (thereby climbing up the array)

  if (warm_up_buffer > 59 && h_of_t === true && gamma < -(confidence_threshold) && has_traded === false) {

    console.log("SELL at<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<")

    min_ask = Number(orderbookSync.books['BTC-USD']._asks.min().price.toString());


        tradable_amount = tradable_amount * 100000000;
        tradable_amount = Math.floor(tradable_amount);
        tradable_amount = (tradable_amount / 100000000);

        var sellParams = {
          price: min_ask,
          size: tradable_amount,
          product_id: 'BTC-USD',
          post_only: true,
          time_in_force: "GTT",
          cancel_after: "min",
        };

        authedClient.sell(sellParams, callback);

        console.log(sellParams)

        //this needs to be on completion:

        transaction_price = min_ask;
        tradable_amount = 0;
        has_traded = true;
      session_trade_increment = session_trade_increment + 1;
      console.log(total_profit)

    }
  });

  console.log('========================================================')
  console.log("Volume:")
  console.log(volume_array.reduce(getSum))

  console.log("delta_p:")
  console.log(delta_p)
  console.log("p_avg_this_period is:")
  console.log(p_avg_this_period)

  console.log("Recently trasacted at price: ")
  console.log(transaction_price)

  if (h_of_t === false) {
    console.log("BUY ... BUY ... BUY ... BUY")
  } else {
      console.log("SELL ... SELL ... SELL ... SELL")
  }


  if (total_profit < transaction_price) {
    console.log("Cumulative Profit stands at:")
    console.log(total_profit)
} else {
    console.log("Cumulative Profit stands at (variable total_profit > transaction_price):");

    let difference = total_profit - transaction_price;

    console.log(difference);
}


console.log("Has Traded?")
console.log(has_traded)
console.log("tradable_amount =")
console.log(tradable_amount)



console.log('========================================================')

internal_State = {
  volume_array: volume_array,
  delta_p_array: delta_p_array,
  c_Sub_Ro_array: c_Sub_Ro_array,
  price_start_array: price_start_array,
  p_avg_this_period_array: p_avg_this_period_array,
  warm_up_buffer: warm_up_buffer,
  l: l,
  array: array,
  delta_p: delta_p,
  price_float: price_float,
  price_start:price_start,
  i: i,
  volume: volume,
  c_Sub_Ro: c_Sub_Ro,
  tally_Count: tally_Count,
  delta_p_previous_period: delta_p_previous_period,
  gamma: gamma,
  h_of_t: h_of_t,
  confidence_threshold: confidence_threshold,
  tradable_amount: tradable_amount,
  total_profit: total_profit,
  latest_trade: latest_trade,
  p_avg_this_period: p_avg_this_period,
  p_avg_previous_period: p_avg_previous_period,
  last_buy: last_buy,
  last_sell: last_sell,
  sell_profit: sell_profit,
  sell_profit_fix: sell_profit_fix,
  x_Of_T: x_Of_T,
  session_trade_increment: session_trade_increment,
  transaction_price: transaction_price,
  max_bid: max_bid,
  min_ask: min_ask,
  d_of_t: d_of_t,
  y: y
};

    saveState();

  volume = 0;
  i = 0;


    if (warm_up_buffer < 65) {
      warm_up_buffer = warm_up_buffer + 1;
    }

    if (y < 11) {
      y = y + 1;
    } else {
      y = 0;
    }

}, 5000);

// Websocket Listening

websocket.on('message', data => {

  if (data.type === 'done') {

    if (order_map.has(data.order_id)) {

        if (data.reason === "canceled"){

        // inspect cancelled order for reamining size
        // should probably add some logic to toggle the state if tradable_amount dips below some threshold value

        let remaining_size_after_cancel = Number(data.remaining_size);
        let traded_amount_initially_in_map = Number(order_map.get(data.order_id));

        let amount_traded = traded_amount_initially_in_map - remaining_size_after_cancel;

        latest_trade = getFormattedDate();
        let e = uuidv4();
        let stand_in_price = Number(data.price);
        let side = data.side;
        let remaining_size = Number(data.remaining_size);

            if (side === "sell") {
              // if selling
              total_profit = total_profit + (traded_amount_initially_in_map - remaining_size_after_cancel)*stand_in_price;
            } else {
              //if buying
              total_profit = total_profit - (traded_amount_initially_in_map - remaining_size_after_cancel)*stand_in_price;
            }

        test_trades.insert({
                        type: side,
                        price: stand_in_price,
                        cancelled: "cancelled order, but partially traded--the traded amount is below:",
                        amount_traded: amount_traded,
                        confidence: gamma,
                        total_profit: total_profit,
                        volume: volume,
                        delta_p: delta_p,
                        c_Sub_Ro: c_Sub_Ro,
                        tally_Count: tally_Count,
                        session_trade_increment: session_trade_increment
                      }, latest_trade + '_' + 'e', function(err, body, header) {
            if (err) {
              console.log('[test_trades.insert] ', err.message);
              //return;
            }
          });

        tradable_amount = tradable_amount + remaining_size;
        tradable_amount = tradable_amount * 100000000;
        tradable_amount = Math.floor(tradable_amount);
        tradable_amount = (tradable_amount / 100000000);

        cancelled_or_filled_flag = true;

      }

      if (data.reason === "filled") {

        //the order has been filled

        let remaining_size_after_cancel = Number(data.remaining_size);
        let traded_amount_initially_in_map = Number(order_map.get(data.order_id));

        let amount_traded = traded_amount_initially_in_map - remaining_size_after_cancel;

        latest_trade = getFormattedDate();
        let e = uuidv4();
        let stand_in_price = Number(data.price);
        let side = data.side;
        let remaining_size = Number(data.remaining_size);

        if (side === "sell") {
        // if selling
          total_profit = total_profit + (traded_amount_initially_in_map - remaining_size_after_cancel)*stand_in_price;
        } else {
        //if buying
          total_profit = total_profit - (traded_amount_initially_in_map - remaining_size_after_cancel)*stand_in_price;
        }

        test_trades.insert({
            type: side,
            price: stand_in_price,
            amount_traded: amount_traded,
            confidence: gamma,
            total_profit: total_profit,
            volume: volume,
            delta_p: delta_p,
            c_Sub_Ro: c_Sub_Ro,
            tally_Count: tally_Count,
            session_trade_increment: session_trade_increment
          }, latest_trade + '_' + 'e', function(err, body, header) {
            if (err) {
              console.log('[test_trades.insert] ', err.message);
            //  return;
            }
          });

        tradable_amount = tradable_amount + remaining_size;

        tradable_amount = tradable_amount * 100000000;
        tradable_amount = Math.floor(tradable_amount);
        tradable_amount = (tradable_amount / 100000000);

        cancelled_or_filled_flag = true;

      }

      if (cancelled_or_filled_flag === true) {

        console.log("Before order_map is deleted it is:");
        console.log(order_map);
        order_map.delete(data.order_id);
        console.log("After order_map is deleted it is:");
        console.log(order_map);
        flip_flop_flag = true;
        cancelled_or_filled_flag = false;
      }

    }

    if (flip_flop_flag === true && order_map.size === 0 && has_traded === true){
    flip_flop_flag = false;
    if (tradable_amount < 0.025 ) {
      if (tradable_amount === 0) {
        tradable_amount = 0.05;
        console.log("h_of_t flipped! (1) Here is the tradable_amount to be used in the next period:")
        console.log(tradable_amount);
        h_of_t = !(h_of_t);
      } else {
        tradable_amount = 0.05 - tradable_amount;
        tradable_amount = tradable_amount * 100000000;
        tradable_amount = Math.floor(tradable_amount);
        tradable_amount = (tradable_amount / 100000000);
        console.log("h_of_t flipped! (2) Here is the tradable_amount to be used in the next period:")
        console.log(tradable_amount);
        h_of_t = !(h_of_t);
      }

      //If, after parsing incoming messages and updating internal values, I find that
      //I have less than .125 to trade, I flip the state.

      }
    has_traded = false;
  }
}

  if (!(data.type === 'match'))
      return

  if (order_map.has(data.maker_order_id)) {

    let traded_amount = Number(data.size);
    let tradable_amount_in_map = order_map.get(data.maker_order_id);
    tradable_amount_in_map = Number(tradable_amount_in_map);
    let stand_in_price = Number(data.price);

    if (tradable_amount_in_map - traded_amount === 0) {
          console.log ("I've recieved a match message indicating I have no tradable_amount left before my order_map was deleted--probably shouldn't be seeing this.")//order_map.delete(data.maker_order_id);
    } else {
    //  tradable_amount_in_map = tradable_amount_in_map - traded_amount;
      console.log("Order ID")
      console.log(data.maker_order_id)
      console.log("has the following left to be traded:")
      console.log(tradable_amount_in_map)
      //order_map.set(data.maker_order_id, tradable_amount_in_map);
    }

  }


  volume_sub_i = data.size;
  volume_sub_i = Number(volume_sub_i);
  volume = volume + volume_sub_i;

  if ( i === 0) {
    price_start = data.price;
    price_start = Number(price_start);
    i = 1
    //console.log('Chitty Chitty Bang Bang!')
    }
  price_float = data.price;
  price_float = Number(price_float);

});

//

websocket.on('error', err => {

console.log(err);
let e = uuidv4();
test_trades.insert({
                type: "ERROR",
                err: err,
                tradable_amount: tradable_amount,
                p_avg_this_period: p_avg_this_period,
                confidence: gamma,
                total_profit: total_profit,
                volume: volume,
                delta_p: delta_p,
                c_Sub_Ro: c_Sub_Ro,
                tally_Count: tally_Count,
                session_trade_increment: session_trade_increment
              }, latest_trade + '_' + 'e', function(err, body, header) {
      if (err) {
        console.log('[test_trades.insert] ', err.message);
        return;
      }
    });
  });

websocket.on('close', () => {

  //log_message('ERROR', 'Websocket Error', `websocket closed unexpectedly with data: ${data}. Attempting to re-connect.`);

      // try to re-connect the first time...
      websocket_client.connect();

      let count = 1;
      // attempt to re-connect every 30 seconds.
      // TODO: maybe use an exponential backoff instead
      const interval = setInterval(() => {
          if (!websocket_client.socket) {
              count++;
              // send me a email if it keeps failing every 30/2 = 15 minutes
              if (count % 30 === 0) {
                  const time_since = 30 * count;
                //  log_message('CRIT', 'Websocket Error', `Attempting to re-connect for the ${count} time. It has been ${time_since} seconds since we lost connection.`);
              }
              websocket_client.connect();
          }
          else {
              clearInterval(interval);
          }
      }, 30000);

let e = uuidv4();
latest_trade, function(err, body, header) {
        if (err) {
          console.log('[test_trades.insert] ', err.message);
          return;
        }
      }
    });

// ==================================================================================

//            Use Express to Send Data to Pickeled Python Model Below

// ==================================================================================

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.post("/postdata", (req, res) => {

    var p_of_x_of_t = req.body;
    gamma = Number(p_of_x_of_t);
    res.send("process completed");

});

app.get("/getdata", (req, res) => {

  var data = {

    helper_Tally_Count : x_Of_T,
    y_Of_T : delta_p,
    volume : array[y].reduce(getSum),
    tally_Count : tally_Count,
    c_Sub_Ro : c_Sub_Ro

    }

  res.status(200).json(data)

});

app.listen(PORT);

// ==================================================================================

//                                     End

// ==================================================================================
