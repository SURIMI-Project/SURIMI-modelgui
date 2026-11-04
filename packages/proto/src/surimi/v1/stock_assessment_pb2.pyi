from surimi.v1 import species_pb2 as _species_pb2
from google.protobuf.internal import containers as _containers
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable, Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class SpeciesStockAssessment(_message.Message):
    __slots__ = ("species", "stock_assessments")
    SPECIES_FIELD_NUMBER: _ClassVar[int]
    STOCK_ASSESSMENTS_FIELD_NUMBER: _ClassVar[int]
    species: _species_pb2.Species
    stock_assessments: _containers.RepeatedCompositeFieldContainer[StockAssessment]
    def __init__(self, species: _Optional[_Union[_species_pb2.Species, _Mapping]] = ..., stock_assessments: _Optional[_Iterable[_Union[StockAssessment, _Mapping]]] = ...) -> None: ...

class StockAssessment(_message.Message):
    __slots__ = ("year", "exploitation", "stock_status")
    YEAR_FIELD_NUMBER: _ClassVar[int]
    EXPLOITATION_FIELD_NUMBER: _ClassVar[int]
    STOCK_STATUS_FIELD_NUMBER: _ClassVar[int]
    year: int
    exploitation: float
    stock_status: float
    def __init__(self, year: _Optional[int] = ..., exploitation: _Optional[float] = ..., stock_status: _Optional[float] = ...) -> None: ...

class StockAssessmentSummary(_message.Message):
    __slots__ = ("species_stock_assessments",)
    SPECIES_STOCK_ASSESSMENTS_FIELD_NUMBER: _ClassVar[int]
    species_stock_assessments: _containers.RepeatedCompositeFieldContainer[SpeciesStockAssessment]
    def __init__(self, species_stock_assessments: _Optional[_Iterable[_Union[SpeciesStockAssessment, _Mapping]]] = ...) -> None: ...
