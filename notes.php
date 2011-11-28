<?php

function guid() {
	$charid = md5(uniqid('', true));
	$uuid = substr($charid, 0, 8).'-'
		.substr($charid, 8, 4).'-'
		.substr($charid,12, 4).'-'
		.substr($charid,16, 4).'-'
		.substr($charid,20,12);
	return $uuid;
}

header('Cache-Control: no-store, no-cache, must-revalidate');

$file = 'notes.json';
$data = (array)json_decode(file_get_contents($file), true);

$id = trim($_SERVER['PATH_INFO'], '/');
$_POST = json_decode(file_get_contents('php://input'), true);

switch ($_SERVER['REQUEST_METHOD']) {
	case 'POST':
		$_POST['id'] = $id = guid();
	case 'PUT':
		if ($id) {
			$data[$id] = $_POST;
		} else {
			foreach ($_POST as $item)
				$data[$item['id']] = $item;
		}
		file_put_contents($file, json_encode($data));
		echo json_encode($id ? $data[$id] : $data);
		break;
	case 'GET':
		if ($id)
			echo json_encode($data[$id]);
		else
			echo json_encode(array_values($data));
		break;
	case 'DELETE':
		if (isset($data[$id])) {
			unset($data[$id]);
			file_put_contents($file, json_encode($data));
		}
		break;
}