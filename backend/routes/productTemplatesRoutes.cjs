const express = require('express');
const router = express.Router();

let productTemplates = [
    { id: 1, name: 'قالب مدرن', category: 'کاشی' },
    { id: 2, name: 'قالب کلاسیک', category: 'سرامیک' }
];

router.get('/', (req, res) => {
    res.json(productTemplates);
});

router.post('/', (req, res) => {
    const newTemplate = { id: Date.now(), ...req.body };
    productTemplates.push(newTemplate);
    res.status(201).json(newTemplate);
});

module.exports = router;
