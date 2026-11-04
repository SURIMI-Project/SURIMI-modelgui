from buf.validate import validate_pb2 as _validate_pb2
from surimi.v1 import species_pb2 as _species_pb2
from google.protobuf.internal import containers as _containers
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable, Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class BiomassGrid(_message.Message):
    __slots__ = ("species", "biomass_cells")
    SPECIES_FIELD_NUMBER: _ClassVar[int]
    BIOMASS_CELLS_FIELD_NUMBER: _ClassVar[int]
    species: _species_pb2.Species
    biomass_cells: _containers.RepeatedCompositeFieldContainer[BiomassCell]
    def __init__(self, species: _Optional[_Union[_species_pb2.Species, _Mapping]] = ..., biomass_cells: _Optional[_Iterable[_Union[BiomassCell, _Mapping]]] = ...) -> None: ...

class BiomassCell(_message.Message):
    __slots__ = ("longitude", "latitude", "biomass")
    LONGITUDE_FIELD_NUMBER: _ClassVar[int]
    LATITUDE_FIELD_NUMBER: _ClassVar[int]
    BIOMASS_FIELD_NUMBER: _ClassVar[int]
    longitude: float
    latitude: float
    biomass: float
    def __init__(self, longitude: _Optional[float] = ..., latitude: _Optional[float] = ..., biomass: _Optional[float] = ...) -> None: ...

class BiomassSummary(_message.Message):
    __slots__ = ("biomass_grids",)
    BIOMASS_GRIDS_FIELD_NUMBER: _ClassVar[int]
    biomass_grids: _containers.RepeatedCompositeFieldContainer[BiomassGrid]
    def __init__(self, biomass_grids: _Optional[_Iterable[_Union[BiomassGrid, _Mapping]]] = ...) -> None: ...
