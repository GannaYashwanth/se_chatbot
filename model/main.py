from flask import Flask
from markupsafe import escape
from chat import get_response

app = Flask(__name__)

@app.route("/")
def welcome():
    return f"Welcome to chatbot api!"



@app.route("/<msg>")
def response(msg):
    return f"{get_response(msg)}"


