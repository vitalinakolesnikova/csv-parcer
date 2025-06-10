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

	for (let i = startRecord; i < endRecord; i++) {

		let normalisedTagsList = [];
		let customCollectionsNames = dataToNormalize[i]['Custom Collections'].split(',').map(item => item.trim().toLowerCase());
		let smartCollectionsNames = dataToNormalize[i]['Smart Collections'].split(',').map(item => item.trim().toLowerCase());
		let productTitleLowerCase = dataToNormalize[i]['Title'].toLowerCase();
		let productDescription = dataToNormalize[i]['Body HTML'].split('<h6>WHY WE LOVE IT</h6>')[1];
		let shortDescription = dataToNormalize[i]['Metafield: product.short_description [string]'].split('<ul>')[1];
		shortDescription = '<ul>' + shortDescription;


		customCollectionsNames.forEach(customCollectionName => {
			if (customCollectionName === 'tops') {
				normalisedTagsList.push('Tops');
			}
			if (customCollectionName === 'bottoms') {
				normalisedTagsList.push('Bottoms');
			}
			if (customCollectionName === 'cashmere') {
				normalisedTagsList.push('Knitwear');
			}
			if (customCollectionName === 'bra-underwear') {
				normalisedTagsList.push('Intimates');
			}
			if (customCollectionName === 'soleil') {
				normalisedTagsList.push('Swim');
			}
			if (customCollectionName === 'accessories') {
				normalisedTagsList.push('Accessories');
			}
			if (customCollectionName === 'accessories' && productTitleLowerCase.includes('sock')) {
				normalisedTagsList.push('Socks');
			}
			if (customCollectionName === 'bodysuits') {
				normalisedTagsList.push('Bodysuits');
			}
			if (customCollectionName === 'tank-styles') {
				normalisedTagsList.push('Tanks');
			}
			if (customCollectionName === 't-shirt-styles') {
				normalisedTagsList.push('T-shirts');
			}
			if (customCollectionName === 'bra-underwear' && productTitleLowerCase.includes('bra')) {
				normalisedTagsList.push('Bra');
			}
			if (customCollectionName === 'bra-underwear'
				&& (productTitleLowerCase.includes('shorts') || productTitleLowerCase.includes('thong') || productTitleLowerCase.includes('brief'))) {
				normalisedTagsList.push('Underwear');
			}
			if (customCollectionName === 'terry' && productTitleLowerCase.includes('sweatshirt')) {
				normalisedTagsList.push('Sweatshirts');
			}
			if (customCollectionName === 'terry' && productTitleLowerCase.includes('sweatpants')) {
				normalisedTagsList.push('Sweatpants');
			}
		})

		smartCollectionsNames.forEach(smartCollectionsName => {
			if (smartCollectionsName === 'dresses-1') {
				normalisedTagsList.push('Dresses');
			}
			if (smartCollectionsName === 'dresses-1' && productTitleLowerCase.includes('mini')) {
				normalisedTagsList.push('Mini');
			}
			if (smartCollectionsName === 'dresses-1' && productTitleLowerCase.includes('maxi')) {
				normalisedTagsList.push('Maxi');
			}
		})

		normalized.push({
			'ID': dataToNormalize[i]['﻿"ID"'],
			'Handle': dataToNormalize[i]['Handle'],
			'Command': 'MERGE',
			'Body HTML':productDescription,
			'Tags': normalisedTagsList.join(', '),
			'Tags Command': 'REPLACE',
			'Metafield: custom.size_fit_information [string]': shortDescription,
			'Metafield: custom.product_collections [string]': normalisedTagsList,
		});
	}
	return normalized;
}

const normalizeData2 = async (dataToNormalize, startRecord = 0, endRecord = 10) => {
	const normalized = [];
	const uniqNames = [];

	for (let i = startRecord; i < endRecord; i++) {

		let filterCollectionMetafield = dataToNormalize[i]['Metafield: custom.product_collections [list.single_line_text_field]'];
		const filterCollectionMetafieldArray = filterCollectionMetafield.length > 0 ? JSON.parse(filterCollectionMetafield) : '';
		let filterCollectionNormalized = '';

		if (filterCollectionMetafieldArray.length > 0) {
			filterCollectionNormalized = filterCollectionMetafieldArray.map(item => {
				const itemNormalized = item.toLowerCase()
											.replace((/(?<=\b)\p{L}/gu), match => match.toUpperCase())
											.trim()
											.replace('"', '')
				if (!(uniqNames.includes(itemNormalized))) {
					uniqNames.push(itemNormalized)
				}
				return itemNormalized;
			})
			if (dataToNormalize[i]['Handle'] == 'oversized-crewneck-sweatshirt-dove') {
				console.log('before: ', filterCollectionNormalized);
			}

			filterCollectionNormalized = [...new Set(filterCollectionNormalized)];
			if (dataToNormalize[i]['Handle'] == 'oversized-crewneck-sweatshirt-dove') {
				console.log('delete dublicates: ', filterCollectionNormalized);
			}
		}

		if (filterCollectionNormalized.length == 0) {
			filterCollectionNormalized = '';

		}
		else if (filterCollectionNormalized != '') {
			filterCollectionNormalized = arrayToString(filterCollectionNormalized);
		}
		normalized.push({
			'ID': dataToNormalize[i]['ID'],
			'Handle': dataToNormalize[i]['Handle'],
			'Command': 'UPDATE',
			'Metafield: custom.filter_category [list.single_line_text_field]': filterCollectionNormalized
		});

		/*normalized.push({
			'Metafield: custom.product_collections [list.single_line_text_field]': filterCollectionNormalized
		});*/
	}
	console.log('uniqNames: ', uniqNames.sort());
	return normalized;
}

const normalizeData3 = async (dataToNormalize, startRecord = 0, endRecord = 10) => {
	const normalized = [];
	const dataToCheck = await readFile('./csv/eterne-new-not-active-products.csv');

	for (let i = startRecord; i < endRecord; i++) {

		let status;
		let titleEterneNew;

		for (let z = 0; z < 317; z++) {
			console.log("z: ", z);
			console.log("Handle: ", dataToCheck[z]['Handle']);
			if (dataToCheck[z]['Handle'] == dataToNormalize[i]['Handle']) {
				status = dataToCheck[z]['Status'];
				titleEterneNew = dataToCheck[z]['Title'];
				break;
			} else {
				status = null;
				titleEterneNew = null;
			}
		}

		if (status != null) {
			console.log("status: ", status);

			normalized.push({
				'ID': dataToNormalize[i]['﻿"ID"'],
				'Handle': dataToNormalize[i]['Handle'],
				'Command': 'UPDATE',
				'Status': status,
			});
		}

	}
	return normalized;
}

app.get('/', async (req, res) => {
	const dataToNormalize = await readFile('./csv/eterne-alpha-all.csv');


	const normalizedData = await normalizeData3(dataToNormalize, 0, 721);
	const csvHeader = Object.keys(normalizedData[0]).map((item) => {

		return {
			id: item, title: item
		}
	})

	const csvWriter1 = createObjectCsvWriter({
		path: './csv/final-product-status.csv',
		header: csvHeader
	});

	await csvWriter1.writeRecords(normalizedData)

	res.send('Hello World!');
})

app.listen(port, () => {
	console.log(`Example app listening on port ${port}`)
})