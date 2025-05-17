# ocr/routes.py
import os
import tempfile
from werkzeug.utils import secure_filename
import cv2
import pytesseract
import numpy as np
from ocr.categorizer import parse_receipt
import json

# Constants
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
DEFAULT_CATEGORIES = ['nabiał', 'mięso', 'chemia', 'warzywa', 'owoce']

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def read_receipt_image(image_path):
    try:
        image = cv2.imread(image_path)
        gray_image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        _, thresholded_image = cv2.threshold(gray_image, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        text = pytesseract.image_to_string(thresholded_image, lang='pol')
        return text
    except Exception as e:
        print(f"Error reading image: {e}")
        return None

# Handler functions for routes
def handle_process_receipt(request):
    try:
        # Getting categories from form-data or URL params
        if 'categories' in request.form:
            categories_json = request.form['categories']
            categories = json.loads(categories_json)
        else:
            categories_param = request.args.get('categories', None)
            categories = categories_param.split(',') if categories_param else DEFAULT_CATEGORIES

        api_key = request.args.get('api_key', None)

        # Handle file uploaded as 'receipt'
        if 'receipt' not in request.files:
            return {'error': 'No file in request (expected "receipt")'}, 400
        
        file = request.files['receipt']
        if file.filename == '':
            return {'error': 'No file selected'}, 400
        if not allowed_file(file.filename):
            return {'error': f'File extension not allowed. Allowed: png, jpg, jpeg'}, 400

        # Save file to temp directory
        with tempfile.NamedTemporaryFile(delete=False, suffix='.' + file.filename.rsplit('.', 1)[1].lower()) as temp:
            temp_path = temp.name
            file.save(temp_path)

        receipt_text = read_receipt_image(temp_path)
        os.unlink(temp_path)

        if not receipt_text:
            return {'error': 'Failed to read text from image'}, 400

        products = parse_receipt(receipt_text, categories,api_key = os.environ.get("GOOGLE_API_KEY"))
        total_price = sum(product['price'] for product in products)

        categorized_products = {}
        for product in products:
            category = product['category']
            if category not in categories:
                category = 'inne'
            if category not in categorized_products:
                categorized_products[category] = []
            categorized_products[category].append({
                'name': product['name'],
                'price': product['price']
            })

        response = {
            'products': products,
            'categorized_products': categorized_products,
            'total_price': round(total_price, 2),
            'categories_used': categories,
            'amount': round(total_price, 2),
            'description': 'Paragon sklepowy'
        }

        return response, 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {'error': f'Error during processing: {str(e)}'}, 500

def handle_test_receipt(request):
    try:
        # Get categories
        if 'categories' in request.form:
            categories_json = request.form['categories']
            categories = json.loads(categories_json)
        else:
            categories_param = request.args.get('categories', None)
            categories = categories_param.split(',') if categories_param else DEFAULT_CATEGORIES
        
        # Handle receipt file if provided (not used for test data)
        receipt_path = None
        if 'receipt' in request.files:
            receipt_file = request.files['receipt']
            if receipt_file and receipt_file.filename != '':
                filename = secure_filename(receipt_file.filename)
                with tempfile.NamedTemporaryFile(delete=False, suffix='.' + filename.rsplit('.', 1)[1].lower() if '.' in filename else '.jpg') as temp:
                    receipt_path = temp.name
                    receipt_file.save(receipt_path)
        
        # Test data products
        test_products = [
            {'name': 'Chleb pszenny', 'category': 'Groceries', 'price': 4.99},
            {'name': 'Masło extra', 'category': 'Nabial', 'price': 7.49},
            {'name': 'Pomidory', 'category': 'Nabial', 'price': 8.99},
            {'name': 'Jabłka', 'category': 'Groceries', 'price': 5.99},
            {'name': 'Woda mineralna', 'category': 'Groceries', 'price': 2.50},
            {'name': 'Proszek do prania', 'category': 'Groceries', 'price': 19.99}
        ]
        
        total_price = sum(product['price'] for product in test_products)
        
        categorized_products = {}
        for product in test_products:
            category = product['category']
            if category not in categories:
                category = "inne"
                
            if category not in categorized_products:
                categorized_products[category] = []
            categorized_products[category].append({
                'name': product['name'],
                'price': product['price']
            })
        
        response = {
            'products': test_products,
            'categorized_products': categorized_products,
            'total_price': round(total_price, 2),
            'categories_used': categories,
            'amount': total_price,
            'description': 'Paragon sklepowy'
        }
        
        # Clean up temp file if it was created
        if receipt_path and os.path.exists(receipt_path):
            os.unlink(receipt_path)
        
        return response, 200
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {'error': f'Error during processing: {str(e)}'}, 500