L.TileLayer.HERE = L.TileLayer.extend({
	options: {
		subdomains: '1234',

		minZoom: 0,
		maxZoom: 20,

		// option apiKey: String = ''
		// Required option. The `apiKey` provided as part of the HERE credentials
		apiKey: '',

		// option style: String = 'explore.day'
		// Map style to be used ('explore.day', 'explore.night', 'explore.satellite.day', 'lite.day', 'lite.night', 'lite.satellite.day', 'logistics.day', 'satellite.day', 'topo.day')
		style: 'explore.day',

		// option resource: String = 'base'
		// Map resource to be used ('background', 'base', 'blank', 'label')
		resource: 'base',

		// option projection: String = 'mc'
		projection: 'mc',

		// option format: String = 'png8'
		// Image format to be used (`png8`, `png`, or `jpeg`)
		format: 'png8',

		// option tileResolution: Number = 256
		// Image size to be used (256, 512)
		tileResolution: 256,

		// option ppi: Number = 100
		// Image ppi be used (100, 400)
		ppi: 100,

		// option features: String = ''
		// Map Features
		features: null,

		// option language: String = 'en'
		// Map language
		language: null
	},
	initialize: function (options) {
		options = L.setOptions(this, options);

		if (L.Browser.retina) {
			options.tileResolution = 512;
			options.ppi = 400;
		}

		var tileUrl = 'https://maps.hereapi.com/v3/{resource}/{projection}/{z}/{x}/{y}/{format}?apiKey={apiKey}&style={style}&size={tileResolution}';
		var copyrightUrl = 'https://maps.hereapi.com/v3/copyright?apiKey={apiKey}';

		if (options.features) {
			tileUrl += '&features={features}'
		}

		if (options.language && options.language !== 'en') {
			tileUrl += '&lang={language}'
		}

		if (options.ppi !== 100) {
			tileUrl += '&ppi={ppi}';
		}

		this._attributionUrl = L.Util.template(copyrightUrl, this.options);
		L.TileLayer.prototype.initialize.call(this, tileUrl, options);

		this._attributionText = '';
	},
	onAdd: function (map) {
		L.TileLayer.prototype.onAdd.call(this, map);

		if (!this._attributionBBoxes) {
			this._fetchAttributionBBoxes();
		}
	},
	onRemove: function (map) {
		L.TileLayer.prototype.onRemove.call(this, map);

		if (this._map.attributionControl) {
			this._map.attributionControl.removeAttribution(this._attributionText);
		}

		this._map.off('moveend zoomend resetview', this._findCopyrightBBox, this);
	},
	_fetchAttributionBBoxes: function () {
		var xmlhttp = new XMLHttpRequest();
		xmlhttp.onreadystatechange = L.bind(function () {
			if (xmlhttp.readyState === 4 && xmlhttp.status === 200) {
				this._parseAttributionBBoxes(JSON.parse(xmlhttp.responseText));
			}
		}, this);
		xmlhttp.open('GET', this._attributionUrl, true);
		xmlhttp.send();
	},
	_parseAttributionBBoxes: function (json) {
		if (!this._map) { return; }
		var providers = json.copyrights.in;

		for (var i = 0; i < providers.length; i++) {
			if (providers[i].boundingBoxes) {
				for (var j = 0; j < providers[i].boundingBoxes.length; j++) {
					var box = providers[i].boundingBoxes[j];
					providers[i].boundingBoxes[j] = L.latLngBounds([[box.east, box.north], [box.west, box.south]]);
				}
			}
		}

		this._map.on('moveend zoomend resetview', this._findCopyrightBBox, this);

		this._attributionProviders = providers;
		this._findCopyrightBBox();
	},
	_findCopyrightBBox: function () {
		if (!this._map) {
			return;
		}

		var providers = this._attributionProviders;
		var visibleProviders = [];
		var zoom = this._map.getZoom();
		var visibleBounds = this._map.getBounds();

		for (let i = 0; i < providers.length; i++) {
			if (providers[i].minLevel < zoom && providers[i].maxLevel > zoom) {
				if (!providers[i].boundingBoxes) {
					// No boxes = attribution always visible
					visibleProviders.push(providers[i]);
					break;
				}
			}

			for (let j = 0; j < providers[i].boundingBoxes.length; j++) {
				const box = providers[i].boundingBoxes[j];
				if (visibleBounds.overlaps(box)) {
					visibleProviders.push(providers[i]);
					break;
				}
			}
		}

		var attributionText = '© <a href="https://legal.here.com/terms/serviceterms/gb/">HERE maps</a>';

		if (attributionText !== this._attributionText && this._map.attributionControl) {
			this._map.attributionControl.removeAttribution(this._attributionText);
			this._map.attributionControl.addAttribution(this._attributionText = attributionText);
		}
	},
});


L.tileLayer.here = function (opts) {
	return new L.TileLayer.HERE(opts);
}
