# api/index.py
from flask import Flask, request, jsonify
import sys
import os

# Add project root to path if necessary
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import handlers from routes.py
from routes import handle_process_receipt, handle_test_receipt

app = Flask(__name__)

@app.route('/api/receipt', methods=['POST'])
def process_receipt():
    response, status_code = handle_process_receipt(request)
    return jsonify(response), status_code

@app.route('/api/test-receipt', methods=['POST'])
def test_receipt():
    response, status_code = handle_test_receipt(request)
    return jsonify(response), status_code

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'message': 'API is working correctly'}), 200

@app.route('/', methods=['GET'])
def home():
    return jsonify({
        'message': 'OCR Receipt API is running',
        'endpoints': [
            '/api/receipt - Process receipt images',
            '/api/test-receipt - Test endpoint with mock data',
            '/api/health - Health check'
        ]
    })

# For local testing
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)