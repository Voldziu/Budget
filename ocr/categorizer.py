import google.generativeai as genai
import re


def parse_receipt(receipt_text, categories,api_key=None):
    
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-2.0-flash')
    
    template = """
    Będę ci wysyłał treść paragonu. Chciałbym żebyś wypisał mi produkty zawarte w tym paragonie.
    Przypisz mi każdy produkt do jednej z kategorii.
    Kategorie jakie masz do wyboru to: {categories}

    Zwróć uwagę, że niektóre nazwy produktów mogą mieć literówki.

    Niech odpowiedź będzie w takiej formie:

    NazwaProdukt1  
    KategoriaProdukt1  
    CenaProdukt1

    NazwaProdukt2  
    KategoriaProdukt2  
    CenaProdukt2

    Oto treść paragonu:
    {receipt}
    """
    
    prompt = template.format(categories=', '.join(categories), receipt=receipt_text)
    
    response = model.generate_content(prompt)
    result_text = response.text
    
    products = []
    
    lines = [line.strip() for line in result_text.split('\n') if line.strip()]
    
    for i in range(0, len(lines), 3):
        if i + 2 < len(lines):
            name = lines[i]
            category = lines[i+1]
            price_text = lines[i+2]
            
            price_match = re.search(r'(\d+[.,]\d+)', price_text)
            price = float(price_match.group(1).replace(',', '.')) if price_match else 0.0
            
            products.append({
                'name': name,
                'category': category,
                'price': price
            })
    
    return products


def parse_tester(receipt_text, categories):
    products = [
        {
            'name': 'Chleb pszenny',
            'category': 'Pieczywo',
            'price': 4.99
        },
        {
            'name': 'Masło extra',
            'category': 'Nabiał',
            'price': 7.49
        },
        {
            'name': 'Jabłka',
            'category': 'Owoce',
            'price': 5.99
        },
        {
            'name': 'Woda mineralna',
            'category': 'Napoje',
            'price': 2.50
        }
    ]
    
    return products



if __name__ == "__main__":
    categories = ['nabiał', 'mięso', 'chemia', 'warzywa', 'owoce']
    
    receipt_text = """
    Adres siedziby: Poznańska 48, Jankowice 62-      

    Podgórne nr rej: BDO BBOGGŻZÓS Lidl gp. z 6 4. kn
    51-131 Wrocłau, ul. Buforoua 6

    NIP 7811897358 nr:439317

    borat i ARAGON FISKALNY

    orele SUSZONE ,

    Frankfurterki F i "0:03 10.930

    Piątnica Skyr pitny F Isdud d 8
    Piątnica Skyr pitnyż FO f «4.99 4.990
    Piątnica Skyr pitnyż Foo; f x4,99 4.990

    Haribo Złote misie (X >, 2 x3,98 7,98A

    Tropicalfruits żelki X 2 x5,49 10.98A

    Pierogi ruskie 326g F 1 x7,15 7,150

    POSUA an 63,00

    SPRZEDAŻ OPODATKOWANA A 18,96

    SPRZEDAŻ OPODATKONANA C po 44,04

    PIU A 23% a. 335
    PTU C 5% DE 2,18
    SUMA PTU ao oodei p 3,65
    SUMA PLN"; 63,00
    MOL ICŻENIE PŁATNOŚCI | w. 00 PLN
    RESZTA GOTÓWKA *

    00156 «3 63 1945 nr 243418 -03-29 GA

    SGIAGASRÓAAACI dlluaadkii

    I III NIJIJ

    NIP 7811897358 nr :438378
    NIEFISKALNY

    OESIE |
    |" Zar ejestruj się ile |
    | ruj się w Lidl+ |
    | „ 1 oSzczędzaj na swoich |
    || | „Rf. kJ Jnych zakupach! |

    | NIET Ska =
    "ak jada" 16:14
    """
    
    products = parse_receipt(receipt_text, categories)
    
    total_price = 0.0
    print("\nZnalezione produkty:")
    print("-" * 40)
    for product in products:
        print(f"Nazwa: {product['name']}")
        print(f"Kategoria: {product['category']}")
        print(f"Cena: {product['price']:.2f} PLN")
        print("-" * 40)
        total_price += product['price']
    
    print(f"Suma cen produktów: {total_price:.2f} PLN")