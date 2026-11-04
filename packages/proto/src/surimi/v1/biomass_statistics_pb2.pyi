from surimi.v1 import double_statistics_pb2 as _double_statistics_pb2
from surimi.v1 import species_pb2 as _species_pb2
from google.protobuf.internal import containers as _containers
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable, Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class BiomassGridStatistics(_message.Message):
    __slots__ = ("species", "biomass_cells_statistics")
    SPECIES_FIELD_NUMBER: _ClassVar[int]
    BIOMASS_CELLS_STATISTICS_FIELD_NUMBER: _ClassVar[int]
    species: _species_pb2.Species
    biomass_cells_statistics: _containers.RepeatedCompositeFieldContainer[BiomassCellStatistics]
    def __init__(self, species: _Optional[_Union[_species_pb2.Species, _Mapping]] = ..., biomass_cells_statistics: _Optional[_Iterable[_Union[BiomassCellStatistics, _Mapping]]] = ...) -> None: ...

class BiomassCellStatistics(_message.Message):
    __slots__ = ("longitude", "latitude", "biomass")
    LONGITUDE_FIELD_NUMBER: _ClassVar[int]
    LATITUDE_FIELD_NUMBER: _ClassVar[int]
    BIOMASS_FIELD_NUMBER: _ClassVar[int]
    longitude: float
    latitude: float
    biomass: _double_statistics_pb2.DoubleStatistics
    def __init__(self, longitude: _Optional[float] = ..., latitude: _Optional[float] = ..., biomass: _Optional[_Union[_double_statistics_pb2.DoubleStatistics, _Mapping]] = ...) -> None: ...

class BiomassStatisticsSummary(_message.Message):
    __slots__ = ("biomass_grids_statistics",)
    BIOMASS_GRIDS_STATISTICS_FIELD_NUMBER: _ClassVar[int]
    biomass_grids_statistics: _containers.RepeatedCompositeFieldContainer[BiomassGridStatistics]
    def __init__(self, biomass_grids_statistics: _Optional[_Iterable[_Union[BiomassGridStatistics, _Mapping]]] = ...) -> None: ...
