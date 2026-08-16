from fastapi import FastAPI

app = FastAPI()


@app.get("/products")
def list_products():
    ...


@app.post("/orders")
def create_order():
    ...


@app.get("/orders/{order_id}")
def get_order(order_id: int):
    ...
