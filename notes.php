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

$file = 'notes.json';

$timestamp = filemtime($file);
$modified = substr(gmdate('r', $timestamp), 0, -5).'GMT';
$if_modified_since = @$_SERVER['HTTP_IF_MODIFIED_SINCE'];

if ($modified == $if_modified_since) {
	header("HTTP/1.1 304 Not Modified");
	exit;
}
header("Last-Modified: $modified");
header("Expires: $modified");
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Content-type: application/json');

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