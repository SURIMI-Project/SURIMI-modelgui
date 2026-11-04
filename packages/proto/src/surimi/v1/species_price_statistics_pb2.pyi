from surimi.v1 import double_statistics_pb2 as _double_statistics_pb2
from surimi.v1 import species_pb2 as _species_pb2
from google.protobuf.internal import containers as _containers
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable, Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class SpeciesPriceStatistics(_message.Message):
    __slots__ = ("species", "category_code", "market_code", "price", "currency")
    SPECIES_FIELD_NUMBER: _ClassVar[int]
    CATEGORY_CODE_FIELD_NUMBER: _ClassVar[int]
    MARKET_CODE_FIELD_NUMBER: _ClassVar[int]
    PRICE_FIELD_NUMBER: _ClassVar[int]
    CURRENCY_FIELD_NUMBER: _ClassVar[int]
    species: _species_pb2.Species
    category_code: str
    market_code: str
    price: _double_statistics_pb2.DoubleStatistics
    currency: str
    def __init__(self, species: _Optional[_Union[_species_pb2.Species, _Mapping]] = ..., category_code: _Optional[str] = ..., market_code: _Optional[str] = ..., price: _Optional[_Union[_double_statistics_pb2.DoubleStatistics, _Mapping]] = ..., currency: _Optional[str] = ...) -> None: ...

class SpeciesPriceStatisticsSummary(_message.Message):
    __slots__ = ("species_prices_statistics",)
    SPECIES_PRICES_STATISTICS_FIELD_NUMBER: _ClassVar[int]
    species_prices_statistics: _containers.RepeatedCompositeFieldContainer[SpeciesPriceStatistics]
    def __init__(self, species_prices_statistics: _Optional[_Iterable[_Union[SpeciesPriceStatistics, _Mapping]]] = ...) -> None: ...
