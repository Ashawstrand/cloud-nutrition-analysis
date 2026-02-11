FROM python:3.13-slim

WORKDIR /app

# Install system dependencies for matplotlib/seaborn
RUN apt-get update && apt-get install -y \
	libglib2.0-0 \
	libsm6 \
	libxext6 \
	libxrender1 \
	libfreetype6 \
	libpng16-16 \
	&& rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache -r requirements.txt

COPY . /app

CMD ["python", "data_analysis.py"]
