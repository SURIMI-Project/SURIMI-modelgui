from surimi.v1 import double_statistics_pb2 as _double_statistics_pb2
from surimi.v1 import fleet_segment_pb2 as _fleet_segment_pb2
from surimi.v1 import species_pb2 as _species_pb2
from google.protobuf.internal import containers as _containers
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable, Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class DispositionGridStatistics(_message.Message):
    __slots__ = ("species", "fleet_segment", "disposition_cells_statistics")
    SPECIES_FIELD_NUMBER: _ClassVar[int]
    FLEET_SEGMENT_FIELD_NUMBER: _ClassVar[int]
    DISPOSITION_CELLS_STATISTICS_FIELD_NUMBER: _ClassVar[int]
    species: _species_pb2.Species
    fleet_segment: _fleet_segment_pb2.FleetSegment
    disposition_cells_statistics: _containers.RepeatedCompositeFieldContainer[DispositionCellStatistics]
    def __init__(self, species: _Optional[_Union[_species_pb2.Species, _Mapping]] = ..., fleet_segment: _Optional[_Union[_fleet_segment_pb2.FleetSegment, _Mapping]] = ..., disposition_cells_statistics: _Optional[_Iterable[_Union[DispositionCellStatistics, _Mapping]]] = ...) -> None: ...

class DispositionCellStatistics(_message.Message):
    __slots__ = ("longitude", "latitude", "gross_catch", "live_discards", "dead_discards")
    LONGITUDE_FIELD_NUMBER: _ClassVar[int]
    LATITUDE_FIELD_NUMBER: _ClassVar[int]
    GROSS_CATCH_FIELD_NUMBER: _ClassVar[int]
    LIVE_DISCARDS_FIELD_NUMBER: _ClassVar[int]
    DEAD_DISCARDS_FIELD_NUMBER: _ClassVar[int]
    longitude: float
    latitude: float
    gross_catch: _double_statistics_pb2.DoubleStatistics
    live_discards: _double_statistics_pb2.DoubleStatistics
    dead_discards: _double_statistics_pb2.DoubleStatistics
    def __init__(self, longitude: _Optional[float] = ..., latitude: _Optional[float] = ..., gross_catch: _Optional[_Union[_double_statistics_pb2.DoubleStatistics, _Mapping]] = ..., live_discards: _Optional[_Union[_double_statistics_pb2.DoubleStatistics, _Mapping]] = ..., dead_discards: _Optional[_Union[_double_statistics_pb2.DoubleStatistics, _Mapping]] = ...) -> None: ...

class CatchDispositionStatisticsSummary(_message.Message):
    __slots__ = ("disposition_grids_statistics",)
    DISPOSITION_GRIDS_STATISTICS_FIELD_NUMBER: _ClassVar[int]
    disposition_grids_statistics: _containers.RepeatedCompositeFieldContainer[DispositionGridStatistics]
    def __init__(self, disposition_grids_statistics: _Optional[_Iterable[_Union[DispositionGridStatistics, _Mapping]]] = ...) -> None: ...
