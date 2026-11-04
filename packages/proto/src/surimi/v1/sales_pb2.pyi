from buf.validate import validate_pb2 as _validate_pb2
from surimi.v1 import fleet_segment_pb2 as _fleet_segment_pb2
from surimi.v1 import species_pb2 as _species_pb2
from google.protobuf.internal import containers as _containers
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable, Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class Sale(_message.Message):
    __slots__ = ("species", "fleet_segment", "quantity", "category_code", "value")
    SPECIES_FIELD_NUMBER: _ClassVar[int]
    FLEET_SEGMENT_FIELD_NUMBER: _ClassVar[int]
    QUANTITY_FIELD_NUMBER: _ClassVar[int]
    CATEGORY_CODE_FIELD_NUMBER: _ClassVar[int]
    VALUE_FIELD_NUMBER: _ClassVar[int]
    species: _species_pb2.Species
    fleet_segment: _fleet_segment_pb2.FleetSegment
    quantity: float
    category_code: str
    value: float
    def __init__(self, species: _Optional[_Union[_species_pb2.Species, _Mapping]] = ..., fleet_segment: _Optional[_Union[_fleet_segment_pb2.FleetSegment, _Mapping]] = ..., quantity: _Optional[float] = ..., category_code: _Optional[str] = ..., value: _Optional[float] = ...) -> None: ...

class MarketSales(_message.Message):
    __slots__ = ("market_code", "currency", "sales")
    MARKET_CODE_FIELD_NUMBER: _ClassVar[int]
    CURRENCY_FIELD_NUMBER: _ClassVar[int]
    SALES_FIELD_NUMBER: _ClassVar[int]
    market_code: str
    currency: str
    sales: _containers.RepeatedCompositeFieldContainer[Sale]
    def __init__(self, market_code: _Optional[str] = ..., currency: _Optional[str] = ..., sales: _Optional[_Iterable[_Union[Sale, _Mapping]]] = ...) -> None: ...

class SalesSummary(_message.Message):
    __slots__ = ("market_sales",)
    MARKET_SALES_FIELD_NUMBER: _ClassVar[int]
    market_sales: _containers.RepeatedCompositeFieldContainer[MarketSales]
    def __init__(self, market_sales: _Optional[_Iterable[_Union[MarketSales, _Mapping]]] = ...) -> None: ...
