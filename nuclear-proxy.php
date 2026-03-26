<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache');

$serviceKey = '9eab4feb681dd6d23529a5ba74d983bca3cda87753c7393b6a7ee3dec631d9b8';
$baseUrl    = 'http://data.khnp.co.kr/environ/service/realtime/nplantstates';

// 새울(SU) 제외
$sites = ['KR' => '고리', 'WS' => '월성', 'YK' => '한빛', 'UJ' => '한울'];

$unitNameMap = [
    'KR' => ['7호기' => '신고리 1호기', '8호기' => '신고리 2호기'],
    'WS' => ['7호기' => '신월성 1호기', '8호기' => '신월성 2호기'],
    'UJ' => ['7호기' => '신한울 1호기', '8호기' => '신한울 2호기'],
    'YK' => [],
];

$allSites = [];

foreach ($sites as $code => $name) {
    $url = $baseUrl . '?serviceKey=' . $serviceKey . '&SITE_CD=' . $code;
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0');
    $response = curl_exec($ch);
    curl_close($ch);

    libxml_use_internal_errors(true);
    $xml = simplexml_load_string($response);
    if (!$xml || (string)$xml->header->resultCode !== '00') continue;

    $item = $xml->body->items->item;
    if (!$item) continue;

    $nameMap = $unitNameMap[$code] ?? [];
    $units = [];
    for ($i = 1; $i <= 20; $i++) {
        $n  = str_pad($i, 2, '0', STR_PAD_LEFT);
        $nm = (string)$item->{"unit_{$n}Nm"};
        $st = (string)$item->{"unit_{$n}St"};
        $cd = (string)$item->{"unit_{$n}Cd"};
        if (!$nm) break;
        if ($cd === 'KH1204') continue;
        $displayNm = $nameMap[$nm] ?? $nm;
        $units[] = ['nm' => $displayNm, 'st' => $st, 'cd' => $cd];
    }

    if (empty($units)) continue;

    $allSites[] = [
        'code'   => $code,
        'name'   => $name,
        'siteNm' => (string)$item->siteNm,
        'siteMm' => (string)$item->siteMm,
        'units'  => $units,
    ];
}

echo json_encode(['success' => true, 'sites' => $allSites, 'updated' => date('Y-m-d H:i:s')], JSON_UNESCAPED_UNICODE);
