from flask import Flask, jsonify, request
from flask_cors import CORS
from chat import get_response

app = Flask(__name__)
CORS(app)

@app.route("/")
def welcome():
    return f"Welcome to chatbot api!"



@app.route("/<msg>", methods = ['POST', 'GET'])
def response(msg):
    if request.method == 'GET':
        return f"Response :- {get_response(msg)}"
    else:
        return jsonify(result = get_response(msg))



