<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

$productsFile = __DIR__ . '/../products.json';

// دریافت محصولات
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (file_exists($productsFile)) {
        echo file_get_contents($productsFile);
    } else {
        echo json_encode([]);
    }
    exit;
}

// ذخیره محصولات (POST = جایگزینی کامل)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid data']);
        exit;
    }
    $result = file_put_contents($productsFile, json_encode($input));
    if ($result !== false) {
        echo json_encode(['success' => true]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to write file']);
    }
    exit;
}

// حذف (اختیاری - فقط در صورت نیاز)
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    if (file_exists($productsFile)) {
        unlink($productsFile);
    }
    echo json_encode(['success' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
?>
