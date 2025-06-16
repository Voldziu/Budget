import cv2
import pytesseract
import numpy as np


def read_receipt(image_path):
    image = cv2.imread(image_path)
    gray_image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    _, thresholded_image = cv2.threshold(gray_image, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    text = pytesseract.image_to_string(thresholded_image, lang='pol')
    return text


if __name__ == '__main__':
    result = read_receipt("1.jpg")
    print(result)


