Hortus research — processing scripts (October 2026)

These are the scripts that produced every number in Study 01 and Study 02. They read public data only:
NOAA OISST v2.1 and NASA POWER (MERRA-2, IMERG, FLASHFlux) from the AWS Open Data registry,
Copernicus Sentinel-2 L2A Collection 1 through Earth Search on AWS, FAO yields as published by
Our World in Data, and World Bank WDI cereal yields. Files carry a .txt suffix so they can be served
with the research pages; drop the suffix to run them (Python 3.11+, numpy, pandas, xarray, zarr,
netCDF4, statsmodels, scipy, rasterio, pyproj, scikit-learn, Pillow).

Study 01: nino34.py -> analyse.py (index, events) -> merra_regions.py / merra_one.py, imerg_daily_2026.py
          -> analyse2.py (rain, yields, robustness, outlook) -> sst_field.py, build_r1.py (page data)
Study 02: fields.py (Sentinel-2 windows) -> weather.py -> analyse_fields.py -> build_r2.py (page data)
