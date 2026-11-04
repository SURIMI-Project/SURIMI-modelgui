from surimi.v1 import double_statistics_pb2 as _double_statistics_pb2
from surimi.v1 import fleet_segment_pb2 as _fleet_segment_pb2
from surimi.v1 import species_pb2 as _species_pb2
from google.protobuf.internal import containers as _containers
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable, Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class SaleStatistics(_message.Message):
    __slots__ = ("species", "fleet_segment", "quantity", "category_code", "value")
    SPECIES_FIELD_NUMBER: _ClassVar[int]
    FLEET_SEGMENT_FIELD_NUMBER: _ClassVar[int]
    QUANTITY_FIELD_NUMBER: _ClassVar[int]
    CATEGORY_CODE_FIELD_NUMBER: _ClassVar[int]
    VALUE_FIELD_NUMBER: _ClassVar[int]
    species: _species_pb2.Species
    fleet_segment: _fleet_segment_pb2.FleetSegment
    quantity: _double_statistics_pb2.DoubleStatistics
    category_code: str
    value: _double_statistics_pb2.DoubleStatistics
    def __init__(self, species: _Optional[_Union[_species_pb2.Species, _Mapping]] = ..., fleet_segment: _Optional[_Union[_fleet_segment_pb2.FleetSegment, _Mapping]] = ..., quantity: _Optional[_Union[_double_statistics_pb2.DoubleStatistics, _Mapping]] = ..., category_code: _Optional[str] = ..., value: _Optional[_Union[_double_statistics_pb2.DoubleStatistics, _Mapping]] = ...) -> None: ...

class MarketSalesStatistics(_message.Message):
    __slots__ = ("market_code", "currency", "sales_statistics")
    MARKET_CODE_FIELD_NUMBER: _ClassVar[int]
    CURRENCY_FIELD_NUMBER: _ClassVar[int]
    SALES_STATISTICS_FIELD_NUMBER: _ClassVar[int]
    market_code: str
    currency: str
    sales_statistics: _containers.RepeatedCompositeFieldContainer[SaleStatistics]
    def __init__(self, market_code: _Optional[str] = ..., currency: _Optional[str] = ..., sales_statistics: _Optional[_Iterable[_Union[SaleStatistics, _Mapping]]] = ...) -> None: ...

class SalesStatisticsSummary(_message.Message):
    __slots__ = ("market_sales_statistics",)
    MARKET_SALES_STATISTICS_FIELD_NUMBER: _ClassVar[int]
    market_sales_statistics: _containers.RepeatedCompositeFieldContainer[MarketSalesStatistics]
    def __init__(self, market_sales_statistics: _Optional[_Iterable[_Union[MarketSalesStatistics, _Mapping]]] = ...) -> None: ...
