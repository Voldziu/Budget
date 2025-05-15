from flask import Flask, request, jsonify
import os
import tempfile
from werkzeug.utils import secure_filename
import cv2
import pytesseract
import numpy as np
from categorizer import parse_receipt
import json

app = Flask(__name__)

app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024
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
        print(f"Błąd podczas odczytywania obrazu: {e}")
        return None

@app.route('/api/receipt', methods=['POST'])
def process_receipt():
    try:
        # Pobieranie kategorii z form-data lub z parametrów URL
        if 'categories' in request.form:
            categories_json = request.form['categories']
            categories = json.loads(categories_json)
        else:
            categories_param = request.args.get('categories', None)
            categories = categories_param.split(',') if categories_param else DEFAULT_CATEGORIES

        api_key = request.args.get('api_key', None)

        # Obsługa pliku przesłanego pod kluczem 'receipt'
        if 'receipt' not in request.files:
            return jsonify({'error': 'Brak pliku w żądaniu (oczekiwano "receipt")'}), 400
        
        file = request.files['receipt']
        if file.filename == '':
            return jsonify({'error': 'Nie wybrano pliku'}), 400
        if not allowed_file(file.filename):
            return jsonify({'error': f'Niedozwolone rozszerzenie pliku. Dozwolone: {", ".join(ALLOWED_EXTENSIONS)}'}), 400

        # Zapisanie pliku do katalogu tymczasowego
        with tempfile.NamedTemporaryFile(delete=False, suffix='.' + file.filename.rsplit('.', 1)[1].lower()) as temp:
            temp_path = temp.name
            file.save(temp_path)

        receipt_text = read_receipt_image(temp_path)
        os.unlink(temp_path)

        if not receipt_text:
            return jsonify({'error': 'Nie udało się odczytać tekstu z obrazu'}), 400

        products = parse_receipt(receipt_text, categories, api_key='API_KEY')
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
            'amount': round(total_price, 2),  # Analogicznie jak w test-receipt
            'description': 'Paragon sklepowy'
        }

        return jsonify(response), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Wystąpił błąd podczas przetwarzania: {str(e)}'}), 500


@app.route('/api/test-receipt', methods=['POST'])
def test_receipt():
    try:
        # Sprawdź czy kategorie są w form-data
        if 'categories' in request.form:
            categories_json = request.form['categories']
            categories = json.loads(categories_json)
            print(f"Otrzymane kategorie z formularza: {categories}")
        else:
            # Sprawdź czy kategorie są w parametrach URL (wariant alternatywny)
            categories_param = request.args.get('categories', None)
            print(f"Parametr kategorii z URL: {categories_param}")
            categories = categories_param.split(',') if categories_param else DEFAULT_CATEGORIES
            
        print(f"Używane kategorie: {categories}")
        
        # Obsługa przesłanego zdjęcia
        receipt_path = None
        
        # Sprawdź, czy jest plik w żądaniu pod kluczem 'receipt'
        if 'receipt' in request.files:
            receipt_file = request.files['receipt']
            
            if receipt_file and receipt_file.filename != '':
                # Zabezpiecz nazwę pliku
                filename = secure_filename(receipt_file.filename)
                
                # Utwórz tymczasowy plik do zapisania obrazu
                with tempfile.NamedTemporaryFile(delete=False, suffix='.' + filename.rsplit('.', 1)[1].lower() if '.' in filename else '.jpg') as temp:
                    receipt_path = temp.name
                    receipt_file.save(receipt_path)
                    print(f"Zapisano obraz paragon do: {receipt_path}")
                
                # Tutaj możesz dodać kod do analizy obrazu przy użyciu OCR
                # Na przykład:
                # receipt_text = read_receipt_image(receipt_path)
                # parsed_data = analyze_receipt_text(receipt_text)
                # print(f"Wynik analizy: {parsed_data}")
        
        # Tutaj możesz dodać prawdziwą analizę obrazu i ekstrakcję danych
        # Dla celów testowych użyjemy fikcyjnych danych
        
        # Symulowane dane produktów (możesz zastąpić to prawdziwą analizą)
        test_products = [
            {
                'name': 'Chleb pszenny',
                'category': 'Groceries',
                'price': 4.99
            },
            {
                'name': 'Masło extra',
                'category': 'Nabial',
                'price': 7.49
            },
            {
                'name': 'Pomidory',
                'category': 'Nabial',
                'price': 8.99
            },
            {
                'name': 'Jabłka',
                'category': 'Groceries',
                'price': 5.99
            },
            {
                'name': 'Woda mineralna',
                'category': 'Groceries',
                'price': 2.50
            },
            {
                'name': 'Proszek do prania',
                'category': 'Groceries',
                'price': 19.99
            }
        ]
        
        # Przygotuj odpowiedź
        total_price = sum(product['price'] for product in test_products)
        
        categorized_products = {}
        for product in test_products:
            category = product['category']
            # Sprawdź, czy kategoria istnieje w liście kategorii użytkownika
            # Jeśli nie, użyj "innych" lub najbliższego dopasowania
            if category not in categories:
                # Tutaj możesz dodać bardziej zaawansowaną logikę dopasowania kategorii
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
            'amount': total_price,  # Do ustawienia kwoty transakcji
            'description': 'Paragon sklepowy'  # Do ustawienia opisu
        }
        
        # Usuń tymczasowy plik, jeśli został utworzony
        if receipt_path and os.path.exists(receipt_path):
            #os.unlink(receipt_path)
            print(f"Usunięto tymczasowy plik: {receipt_path}")
        
        return jsonify(response), 200
        
    except Exception as e:
        print(f"Błąd podczas przetwarzania żądania: {e}")
        import traceback
        traceback.print_exc()
        
        # Usuń tymczasowy plik w przypadku błędu
        if 'receipt_path' in locals() and receipt_path and os.path.exists(receipt_path):
            os.unlink(receipt_path)
            print(f"Usunięto tymczasowy plik po błędzie: {receipt_path}")
            
        return jsonify({'error': f'Wystąpił błąd podczas przetwarzania: {str(e)}'}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'message': 'API działa poprawnie'}), 200



if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)