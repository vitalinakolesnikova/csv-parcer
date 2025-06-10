import express from 'express';
import { parse } from 'csv-parse';
import * as fs from 'fs';
import { createObjectCsvWriter } from 'csv-writer';
import fetch from 'node-fetch';

const app = express();
const port = 3000;

const readFile = async (file) => {
	const records = [];
	const parser = fs.createReadStream(file)
		.pipe(parse({
			delimiter: ',',
			columns: true,
			ltrim: true,
			relax_quotes: true,
		}));
	for await (const record of parser) {
		records.push(record);
	}

	return records;
}

const arrayToString = (arr) => {
	let str = ''
	arr.forEach(function(item, index) {
		if (index == 0) {
			str += '['
		}

		str += `"${item}"`;

		if (index != (arr.length - 1)) {
			str += ','
		}

		if (index == (arr.length - 1)) {
			str += ']'
		}
	});
	return str;
}

const normalizeData = async (dataToNormalize, startRecord = 0, endRecord = 10) => {
	const normalized = [];
	const dataToCheck = await readFile('./csv/Eterne-New.csv');
	const eNewHandles = [];

	for (let z = 0; z < 844; z++) {
		eNewHandles.push(dataToCheck[z]['Handle']);
	}

	for (let i = startRecord; i < endRecord; i++) {

		let eAlphaHandle = dataToNormalize[i]['Handle'];
		let status = dataToNormalize[i]['Status'];
		let matched = eNewHandles.includes(eAlphaHandle);

		if (!matched) {
			console.log("handle: ", eAlphaHandle, " matched: ", matched, "status: ", status);
			normalized.push({
				'ID': dataToNormalize[i]['ID'],
				'Handle': dataToNormalize[i]['Handle'],
				'Command': 'MERGE',
				'Actual Status': status,
				'Status': 'Archived',
			});
		}

	}
	return normalized;
}

app.get('/', async (req, res) => {
	const dataToNormalize = await readFile('./csv/Eterne-Alpha.csv');

	/* Endrecord = Кол-во записей в файле - 1 */

	const normalizedData = await normalizeData(dataToNormalize, 0, 922);
	const csvHeader = Object.keys(normalizedData[0]).map((item) => {

		return {
			id: item, title: item
		}
	})

	const csvWriter1 = createObjectCsvWriter({
		path: './csv/final-archived-product.csv',
		header: csvHeader
	});

	await csvWriter1.writeRecords(normalizedData)

	res.send('Hello World!');
})

app.listen(port, () => {
	console.log(`Example app listening on port ${port}`)
})